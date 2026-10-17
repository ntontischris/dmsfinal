import { HIDDEN_LABELS } from "./labels";
import type { AuditItem } from "./schema";

// Το «πριν → μετά» μιας γραμμής του Ίχνους σε κείμενο. Η βάση έχει ήδη κρύψει ποσά και κόστος ως {"$hidden": …}·
// εδώ ο δείκτης γίνεται «κρυφό ποσό» / «κρυφό κόστος». Δεν υπολογίζεται τίποτα άλλο.

export type HiddenKind = keyof typeof HIDDEN_LABELS;

export interface ChangeLine {
  key: string;
  before?: string;
  after?: string;
}

// Πεδία τήρησης που δεν λένε τίποτα στον αναγνώστη.
const BOOKKEEPING = new Set([
  "updated_at",
  "updated_by",
  "created_at",
  "created_by",
]);
const MAX_TEXT = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const hiddenKind = (value: unknown): HiddenKind | null =>
  isRecord(value) && (value.$hidden === "amount" || value.$hidden === "cost")
    ? value.$hidden
    : null;

// Ο δείκτης «κρυφό» γίνεται λέξη σε κάθε βάθος (π.χ. μέσα στις αλλαγές ενός Τιμολογίου).
export const plainValue = (value: unknown): unknown => {
  const hidden = hiddenKind(value);
  if (hidden) return HIDDEN_LABELS[hidden];
  if (Array.isArray(value)) return value.map(plainValue);
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, plainValue(inner)]),
    );
  return value;
};

const clip = (text: string): string =>
  text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;

export const valueText = (value: unknown): string => {
  const plain = plainValue(value);
  if (plain === null || plain === undefined || plain === "") return "—";
  if (typeof plain === "string") return clip(plain);
  if (typeof plain === "number" || typeof plain === "boolean")
    return String(plain);
  return clip(JSON.stringify(plain));
};

const recordOf = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

const shown = (key: string): boolean =>
  !BOOKKEEPING.has(key) && key !== "event";

const updateLines = (item: AuditItem): ChangeLine[] => {
  const before = recordOf(item.before);
  const after = recordOf(item.after);
  return (item.changed ?? [])
    .filter(shown)
    .map((key) => ({
      key,
      before: valueText(before[key]),
      after: valueText(after[key]),
    }));
};

const sideLines = (data: unknown, side: "before" | "after"): ChangeLine[] =>
  Object.entries(recordOf(data))
    .filter(([key]) => shown(key))
    .map(([key, value]) => ({ key, [side]: valueText(value) }));

// Αλλαγή: μόνο τα πεδία που άλλαξαν (και κρυφά, αν δεν φαίνονται). Προσθήκη / ενέργεια: το «μετά». Διαγραφή: το «πριν».
export const changeLines = (item: AuditItem): ChangeLine[] => {
  if (item.action === "update") return updateLines(item);
  if (item.action === "delete") return sideLines(item.before, "before");
  return sideLines(item.after, "after");
};

// Το όνομα του Γεγονότος μιας «ενέργειας» (π.χ. corrected, exported), όπως το έγραψε η βάση.
export const eventName = (item: AuditItem): string | null => {
  const event = recordOf(item.after).event;
  return typeof event === "string" && event ? event : null;
};

export const lineText = (line: ChangeLine): string => {
  if (line.before !== undefined && line.after !== undefined)
    return `${line.key}: ${line.before} → ${line.after}`;
  return `${line.key}: ${line.after ?? line.before ?? "—"}`;
};
