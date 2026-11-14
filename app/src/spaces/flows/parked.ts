// Η ουρά των οδηγών στο prototype: οι δουλειές που έμειναν μισές ή περιμένουν, στο localStorage του browser.
// Στην πραγματική εφαρμογή θα τις βγάζει ο κανόνας ουράς της κάθε ροής από τη βάση (flow.md → Queue rule).

// Το Γύρισμα της δουλειάς: η σελίδα του και πόσα μέλη / αντικείμενα είχε την τελευταία φορά που το είδε ο οδηγός.
export interface FilmingPlace {
  path: string;
  crew: number;
  equipment: number;
}

export interface Parked {
  job: string;
  step: number;
  reason: "exit" | "wait";
  at: number;
  // Η μέρα του γυρίσματος, για το βήμα που ανοίγει το Ημερολόγιο σε αυτήν.
  date?: string;
  filming?: FilmingPlace;
}

export interface ActivePlace {
  job: string;
  step: number;
  date?: string;
  filming?: FilmingPlace;
}

const KEY = "flows.parked";
const ACTIVE = "flows.active";
const EVENT = "flows-parked";

const isParked = (value: unknown): value is Parked =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Parked).job === "string" &&
  typeof (value as Parked).step === "number";

export const parseParked = (raw: string | null): readonly Parked[] => {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value) ? value.filter(isParked) : [];
  } catch {
    return [];
  }
};

// Μία γραμμή ανά δουλειά, η νεότερη πρώτη.
export const withParked = (
  rows: readonly Parked[],
  row: Parked,
): readonly Parked[] =>
  [row, ...rows.filter((item) => item.job !== row.job)].sort(
    (a, b) => b.at - a.at,
  );

export const withoutJob = (
  rows: readonly Parked[],
  job: string,
): readonly Parked[] => rows.filter((item) => item.job !== job);

export const readParkedRaw = (): string => {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

const writeParked = (rows: readonly Parked[]): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch (error) {
    console.error("flows.parked", error);
  }
  window.dispatchEvent(new Event(EVENT));
};

export const park = (row: Parked): void =>
  writeParked(withParked(parseParked(readParkedRaw()), row));

export const unpark = (job: string): void =>
  writeParked(withoutJob(parseParked(readParkedRaw()), job));

export const subscribeParked = (onChange: () => void): (() => void) => {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

// Ο ενεργός οδηγός της καρτέλας: όταν μια αποθήκευση στέλνει σε σελίδα χωρίς ?job=, ο οδηγός ξέρει πού ήταν.
export const readActiveRaw = (): string => {
  try {
    return window.sessionStorage.getItem(ACTIVE) ?? "null";
  } catch {
    return "null";
  }
};

export const parseActive = (raw: string): ActivePlace | null => {
  try {
    const value: unknown = JSON.parse(raw);
    return isParked({ ...(value as object), at: 0 })
      ? (value as ActivePlace)
      : null;
  } catch {
    return null;
  }
};

export const readActive = (): ActivePlace | null =>
  parseActive(readActiveRaw());

const writeActive = (place: ActivePlace): void => {
  try {
    window.sessionStorage.setItem(ACTIVE, JSON.stringify(place));
  } catch (error) {
    console.error("flows.active", error);
  }
  window.dispatchEvent(new Event(EVENT));
};

// Η θέση της ίδιας δουλειάς, με ό,τι ξέρει ήδη (μέρα, Γύρισμα) και τις αλλαγές.
export const placeWith = (
  current: ActivePlace | null,
  next: ActivePlace,
): ActivePlace =>
  current?.job === next.job
    ? {
        ...next,
        date: next.date ?? current.date,
        filming: next.filming ?? current.filming,
      }
    : next;

const updateActive = (next: ActivePlace): void =>
  writeActive(placeWith(readActive(), next));

// Κρατά τη μέρα και το Γύρισμα όσο μένουμε στην ίδια δουλειά.
export const rememberActive = (job: string, step: number): void =>
  updateActive({ job, step });

export const rememberDate = (job: string, step: number, date: string): void =>
  updateActive({ job, step, date });

export const rememberFilming = (
  job: string,
  step: number,
  filming: FilmingPlace,
): void => updateActive({ job, step, filming });

// Η γραμμή ουράς ανοίγει τη δουλειά: η καρτέλα παίρνει τη θέση της πριν την πλοήγηση, ώστε ο οδηγός να ξαναμπεί
// ακόμα κι αν η οθόνη χάσει το ?job=. Η γραμμή φεύγει από την ουρά μόνο με το «Τέλος» της δουλειάς.
export const enterParked = (row: Parked): void =>
  writeActive({
    job: row.job,
    step: row.step,
    ...(row.date ? { date: row.date } : {}),
    ...(row.filming ? { filming: row.filming } : {}),
  });

export const forgetActive = (): void => {
  try {
    window.sessionStorage.removeItem(ACTIVE);
  } catch (error) {
    console.error("flows.active", error);
  }
};
