// Οδηγός μέσα σε οδηγό (π.χ. «Στήνω γύρισμα» από Αίτημα στο «Απαντώ σε Πελάτες»): πού γυρνά το «Πίσω σε…» και το «Τέλος».
// Ζει στη μνήμη της καρτέλας, ανά δουλειά. Η αρχική θέση έρχεται στο URL ως ?from=.

import { flowOf, pathOf } from "./flows";
import { updateRun, withOutcome } from "./loop-run";

export interface FromPlace {
  // Η θέση του οδηγού που μας έστειλε (με ?job=&step=).
  href: string;
  // Το βήμα του δικού μας οδηγού όπου μπήκαμε: αν προχωρήσαμε, κάτι έγινε.
  step: number;
}

const fromKey = (job: string): string => `flows.from.${job}`;

// Μόνο εσωτερικές διαδρομές της εφαρμογής.
export const isAppHref = (href: string): boolean =>
  href.startsWith("/app") && !href.startsWith("//");

export const parseFrom = (raw: string | null): FromPlace | null => {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    const place = value as FromPlace;
    return typeof value === "object" &&
      value !== null &&
      typeof place.href === "string" &&
      isAppHref(place.href) &&
      typeof place.step === "number"
      ? place
      : null;
  } catch {
    return null;
  }
};

// Η δουλειά του οδηγού που μας έστειλε.
export const fromJobOf = (href: string): string | null => {
  const query = href.split("#")[0].split("?")[1] ?? "";
  return flowOf(new URLSearchParams(query).get("job"))?.id ?? null;
};

export const fromLabelOf = (href: string): string => {
  const flow = flowOf(fromJobOf(href));
  return flow ? `Πίσω στο «${flow.name}»` : `Πίσω (${pathOf(href)})`;
};

export const readFromRaw = (job: string): string | null => {
  try {
    return window.sessionStorage.getItem(fromKey(job));
  } catch {
    return null;
  }
};

export const readFrom = (job: string): FromPlace | null => {
  try {
    return parseFrom(window.sessionStorage.getItem(fromKey(job)));
  } catch {
    return null;
  }
};

export const rememberFrom = (job: string, place: FromPlace): void => {
  try {
    window.sessionStorage.setItem(fromKey(job), JSON.stringify(place));
  } catch (error) {
    console.error("flows.from", error);
  }
};

export const clearFrom = (job: string): void => {
  try {
    window.sessionStorage.removeItem(fromKey(job));
  } catch (error) {
    console.error("flows.from", error);
  }
};

// Γυρνάμε στον οδηγό που μας έστειλε: αν προχωρήσαμε πέρα από το βήμα όπου μπήκαμε, εκεί μετρά ως δουλειά.
// Επιστρέφει πού γυρνάμε (null = δεν μας έστειλε κανείς).
export const returnFrom = (job: string, step: number): string | null => {
  const place = readFrom(job);
  clearFrom(job);
  if (!place) return null;
  const fromJob = fromJobOf(place.href);
  if (fromJob && step > place.step)
    updateRun(fromJob, (run) => withOutcome(run, "worked", false));
  return place.href;
};
