// «Αργότερα» και «Τι έκλεισα σήμερα» της ουράς στο prototype: στο localStorage του browser (στην εφαρμογή θα ζουν
// στον λογαριασμό). Ίδιο σήμα αλλαγής με τις μισές δουλειές (parked.ts).

import { PARKED_EVENT } from "./parked";

// Γραμμή → μέχρι πότε (ms) λείπει από την ουρά.
export type LaterMap = Readonly<Record<string, number>>;

export interface Closed {
  job: string;
  at: number;
}

const LATER = "flows.later";
const CLOSED = "flows.closed";
const DAY_DONE = "flows.dayDone";

const readRaw = (key: string, fallback: string): string => {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(key, error);
  }
  window.dispatchEvent(new Event(PARKED_EVENT));
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const parseLater = (raw: string): LaterMap => {
  const value = parseJson(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, until]) => typeof until === "number"),
  );
};

export const parseClosed = (raw: string): readonly Closed[] => {
  const value = parseJson(raw);
  return Array.isArray(value)
    ? value.filter(
        (item): item is Closed =>
          typeof item?.job === "string" && typeof item?.at === "number",
      )
    : [];
};

export const readLaterRaw = (): string => readRaw(LATER, "{}");
export const readClosedRaw = (): string => readRaw(CLOSED, "[]");
export const readDayDoneRaw = (): string => readRaw(DAY_DONE, "");

const readLater = (): LaterMap => parseLater(readLaterRaw());

export const withLater = (
  later: LaterMap,
  keys: readonly string[],
  until: number,
): LaterMap => ({
  ...later,
  ...Object.fromEntries(keys.map((key) => [key, until])),
});

export const withoutLater = (
  later: LaterMap,
  keys: readonly string[],
): LaterMap =>
  Object.fromEntries(
    Object.entries(later).filter(([key]) => !keys.includes(key)),
  );

export const postpone = (keys: readonly string[], until: number): void =>
  write(LATER, withLater(readLater(), keys, until));

export const restore = (keys: readonly string[]): void =>
  write(LATER, withoutLater(readLater(), keys));

// Το «Τέλος» μιας δουλειάς τη γράφει στα κλεισμένα (κρατά μόνο τα τελευταία, για το «Τι έκλεισα σήμερα»).
export const recordClosed = (job: string): void =>
  write(
    CLOSED,
    [{ job, at: Date.now() }, ...parseClosed(readClosedRaw())].slice(0, 50),
  );

export const closedSince = (
  closed: readonly Closed[],
  since: number,
): readonly Closed[] => closed.filter((item) => item.at >= since);

// Το «Τέλος» της μέρας: κρατά τη μέρα, ώστε η σύνοψη να μαζέψει ως αύριο.
export const finishDay = (day: string): void => write(DAY_DONE, day);
