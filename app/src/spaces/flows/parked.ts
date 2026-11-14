// Η ουρά των οδηγών στο prototype: οι δουλειές που έμειναν μισές ή περιμένουν, στο localStorage του browser.
// Στην πραγματική εφαρμογή θα τις βγάζει ο κανόνας ουράς της κάθε ροής από τη βάση (flow.md → Queue rule).

export interface Parked {
  job: string;
  step: number;
  reason: "exit" | "wait";
  at: number;
  // Η μέρα του γυρίσματος, για το βήμα που ανοίγει το Ημερολόγιο σε αυτήν.
  date?: string;
}

export interface ActivePlace {
  job: string;
  step: number;
  date?: string;
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
export const readActive = (): ActivePlace | null => {
  try {
    const value: unknown = JSON.parse(
      window.sessionStorage.getItem(ACTIVE) ?? "null",
    );
    return isParked({ ...(value as object), at: 0 })
      ? (value as ActivePlace)
      : null;
  } catch {
    return null;
  }
};

const writeActive = (place: ActivePlace): void => {
  try {
    window.sessionStorage.setItem(ACTIVE, JSON.stringify(place));
  } catch (error) {
    console.error("flows.active", error);
  }
};

// Κρατά τη μέρα του γυρίσματος όσο μένουμε στην ίδια δουλειά.
export const rememberActive = (job: string, step: number): void => {
  const current = readActive();
  writeActive({
    job,
    step,
    ...(current?.job === job && current.date ? { date: current.date } : {}),
  });
};

export const rememberDate = (job: string, step: number, date: string): void =>
  writeActive({ job, step, date });

export const forgetActive = (): void => {
  try {
    window.sessionStorage.removeItem(ACTIVE);
  } catch (error) {
    console.error("flows.active", error);
  }
};
