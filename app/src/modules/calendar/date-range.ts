// Ημερολογιακές μέρες ως «ΕΕΕΕ-ΜΜ-ΗΗ»· η αριθμητική γίνεται σε UTC χωρίς ώρα, η ζώνη μπαίνει μόνο στις στιγμές.

export type CalendarView = "week" | "month" | "list";

export const CALENDAR_VIEWS: readonly { id: CalendarView; label: string }[] = [
  { id: "week", label: "Εβδομάδα" },
  { id: "month", label: "Μήνας" },
  { id: "list", label: "Λίστα" },
];

export const LIST_DAYS = 30;
const DAY_MS = 86_400_000;

const WEEKDAYS = ["Δευ", "Τρι", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"] as const;
const MONTHS = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
] as const;

const toDate = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (iso: string, count: number): string =>
  toIso(new Date(toDate(iso).getTime() + count * DAY_MS));

// Δευτέρα = 0 ... Κυριακή = 6.
export const weekdayIndex = (iso: string): number => (toDate(iso).getUTCDay() + 6) % 7;

export const weekdayName = (index: number): string => WEEKDAYS[index] ?? "";

export const mondayOf = (iso: string): string => addDays(iso, -weekdayIndex(iso));

export const daysBetween = (from: string, to: string): number =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);

export const rangeDays = (from: string, count: number): readonly string[] =>
  Array.from({ length: count }, (_, index) => addDays(from, index));

const monthFirst = (iso: string): string => `${iso.slice(0, 7)}-01`;

const monthLast = (iso: string): string => {
  const next = toDate(monthFirst(iso));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return addDays(toIso(next), -1);
};

// Πλέγμα μήνα: από τη Δευτέρα της πρώτης μέρας ως την Κυριακή της τελευταίας (4 έως 6 εβδομάδες).
export const monthGrid = (iso: string): readonly string[] => {
  const start = mondayOf(monthFirst(iso));
  const end = addDays(mondayOf(monthLast(iso)), 6);
  return rangeDays(start, daysBetween(start, end) + 1);
};

export const isSameMonth = (a: string, b: string): boolean => a.slice(0, 7) === b.slice(0, 7);

export const rangeOf = (view: CalendarView, anchor: string): { from: string; to: string } => {
  if (view === "week") {
    const from = mondayOf(anchor);
    return { from, to: addDays(from, 6) };
  }
  if (view === "month") {
    const grid = monthGrid(anchor);
    return { from: grid[0] ?? anchor, to: grid[grid.length - 1] ?? anchor };
  }
  return { from: anchor, to: addDays(anchor, LIST_DAYS - 1) };
};

const shiftMonth = (iso: string, direction: 1 | -1): string => {
  const shifted = toDate(monthFirst(iso));
  shifted.setUTCMonth(shifted.getUTCMonth() + direction);
  const target = toIso(shifted);
  const lastDay = Number(monthLast(target).slice(8));
  const day = Math.min(Number(iso.slice(8)), lastDay);
  return `${target.slice(0, 8)}${String(day).padStart(2, "0")}`;
};

export const shiftAnchor = (view: CalendarView, anchor: string, direction: 1 | -1): string => {
  if (view === "week") return addDays(anchor, 7 * direction);
  if (view === "month") return shiftMonth(anchor, direction);
  return addDays(anchor, LIST_DAYS * direction);
};

const shortDate = (iso: string): string => `${iso.slice(8)}/${iso.slice(5, 7)}`;

export const titleOf = (view: CalendarView, anchor: string): string => {
  if (view === "month") {
    return `${MONTHS[Number(anchor.slice(5, 7)) - 1] ?? ""} ${anchor.slice(0, 4)}`;
  }
  const { from, to } = rangeOf(view, anchor);
  return `${shortDate(from)} – ${shortDate(to)}/${to.slice(0, 4)}`;
};

export const dayNumber = (iso: string): number => Number(iso.slice(8));

// Οι μέρες που δείχνει η προβολή: του μήνα το πλέγμα, αλλιώς το διάστημα της.
export const datesOf = (view: CalendarView, anchor: string): readonly string[] => {
  if (view === "month") return monthGrid(anchor);
  const { from, to } = rangeOf(view, anchor);
  return rangeDays(from, daysBetween(from, to) + 1);
};
