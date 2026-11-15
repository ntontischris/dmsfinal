// Ο γύρος ενός οδηγού που γυρνά (prototype): πόσες γραμμές τελείωσαν, ποιες προσπέρασα, τι έκανα σε κάθε μία.
// Ζει στη μνήμη της καρτέλας (sessionStorage), ανά δουλειά· σβήνει με το «Τέλος». Δίνει το «Γραμμή k από N» και τη φράση
// ολοκλήρωσης με αριθμούς. Οι καθαρές συναρτήσεις είναι πάνω· η αποθήκευση κάτω.

export interface LoopRow {
  // Η γραμμή (π.χ. η διαδρομή της Συνομιλίας): ίδιο κλειδί με το pathname όταν είναι ανοιχτή.
  key: string;
  // Πού ανοίγει.
  href: string;
  // Το είδος της γραμμής, για το βήμα που ανοίγει (FlowStep.opens).
  kind?: string;
}

export interface LoopRun {
  job: string;
  // Γραμμές που τελείωσαν σε αυτόν τον γύρο.
  handled: number;
  // Γραμμές που προσπέρασα («το αφήνω για μετά»).
  skipped: readonly string[];
  // Τι έκανα: απάντηση, δουλειά, απόρριψη… (για τη φράση ολοκλήρωσης).
  tally: Readonly<Record<string, number>>;
  // Πόσες γραμμές περίμεναν την τελευταία φορά που διαβάστηκε η λίστα (μαζί με την τρέχουσα).
  count: number | null;
}

export interface LoopState {
  // Η επόμενη γραμμή που δεν προσπέρασα.
  next: LoopRow | null;
  // Όσες περιμένουν (μαζί με όσες προσπέρασα).
  count: number;
  // Όσες προσπέρασα και ακόμα περιμένουν.
  skippedLeft: number;
}

export const emptyRun = (job: string): LoopRun => ({
  job,
  handled: 0,
  skipped: [],
  tally: {},
  count: null,
});

const isCountMap = (value: unknown): value is Record<string, number> =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((item) => typeof item === "number");

const isRun = (value: unknown, job: string): value is LoopRun => {
  const run = value as LoopRun;
  return (
    typeof value === "object" &&
    value !== null &&
    run.job === job &&
    typeof run.handled === "number" &&
    Array.isArray(run.skipped) &&
    run.skipped.every((key) => typeof key === "string") &&
    isCountMap(run.tally) &&
    (run.count === null || typeof run.count === "number")
  );
};

export const parseRun = (raw: string | null, job: string): LoopRun => {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    return isRun(value, job) ? value : emptyRun(job);
  } catch {
    return emptyRun(job);
  }
};

// Οι γραμμές που περιμένουν, χωρίς όσες προσπέρασα στην κορυφή.
export const loopStateOf = (
  rows: readonly LoopRow[],
  skipped: readonly string[],
): LoopState => {
  const left = rows.filter((row) => !skipped.includes(row.key));
  return {
    next: left[0] ?? null,
    count: rows.length,
    skippedLeft: rows.length - left.length,
  };
};

// Ένα αποτέλεσμα από τον σταθμό (π.χ. «reply»): μετριέται· αν γυρνά στο βήμα 1, η γραμμή τελείωσε.
export const withOutcome = (
  run: LoopRun,
  outcome: string,
  isRowDone: boolean,
): LoopRun => ({
  ...run,
  handled: run.handled + (isRowDone ? 1 : 0),
  tally: { ...run.tally, [outcome]: (run.tally[outcome] ?? 0) + 1 },
});

// Η γραμμή τελείωσε χωρίς αποτέλεσμα από τον σταθμό (π.χ. «Επόμενο αίτημα» του οδηγού).
export const withHandled = (run: LoopRun): LoopRun => ({
  ...run,
  handled: run.handled + 1,
});

export const withSkipped = (run: LoopRun, key: string): LoopRun => ({
  ...run,
  skipped: run.skipped.includes(key) ? run.skipped : [...run.skipped, key],
});

// «Πίσω στη λίστα»: όσες προσπέρασα ξαναμπαίνουν.
export const withoutSkipped = (run: LoopRun): LoopRun => ({
  ...run,
  skipped: [],
});

export const withCount = (run: LoopRun, count: number): LoopRun => ({
  ...run,
  count,
});

// «Γραμμή k από N»: k = όσες τελείωσαν + όσες προσπέρασα + 1, N = όσες τελείωσαν + όσες περιμένουν. null = άγνωστο.
export const counterOf = (
  run: LoopRun,
  skippedLeft: number,
): { k: number; n: number } | null => {
  if (run.count === null || run.count === 0) return null;
  const n = run.handled + run.count;
  return { k: Math.min(run.handled + skippedLeft + 1, n), n };
};

// Η φράση ολοκλήρωσης με τους αριθμούς του γύρου: {reply} → πόσες απαντήσεις κ.λπ.
export const tallyText = (
  template: string,
  tally: Readonly<Record<string, number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(tally[key] ?? 0));

const runKey = (job: string): string => `flows.run.${job}`;

// Οι οθόνες που δείχνουν τον γύρο ακούνε κάθε αλλαγή του (useSyncExternalStore).
const runListeners = new Set<() => void>();
const notifyRun = (): void => runListeners.forEach((listener) => listener());

export const subscribeRun = (listener: () => void): (() => void) => {
  runListeners.add(listener);
  return () => {
    runListeners.delete(listener);
  };
};

export const readRunRaw = (job: string): string | null => {
  try {
    return window.sessionStorage.getItem(runKey(job));
  } catch {
    return null;
  }
};

export const readRun = (job: string): LoopRun => {
  try {
    return parseRun(window.sessionStorage.getItem(runKey(job)), job);
  } catch {
    return emptyRun(job);
  }
};

export const writeRun = (run: LoopRun): void => {
  try {
    window.sessionStorage.setItem(runKey(run.job), JSON.stringify(run));
  } catch (error) {
    console.error("flows.run", error);
  }
  notifyRun();
};

export const updateRun = (
  job: string,
  change: (run: LoopRun) => LoopRun,
): LoopRun => {
  const run = change(readRun(job));
  writeRun(run);
  return run;
};

export const clearRun = (job: string): void => {
  try {
    window.sessionStorage.removeItem(runKey(job));
  } catch (error) {
    console.error("flows.run", error);
  }
  notifyRun();
};
