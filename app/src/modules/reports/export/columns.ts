// Το κοινό σχήμα κάθε εξαγωγής (Ρ6): στήλες με ελληνικό τίτλο και τύπο, γραμμές με κελιά. Από αυτό γράφονται και το
// .xlsx και το .csv. Οι γραμμές έρχονται από τη βάση ως JSON· εδώ μόνο διαβάζονται, δεν υπολογίζεται τίποτα.

// text: κείμενο · integer: πλήθος · number: αριθμός (π.χ. ώρες) · money: ποσό σε ευρώ · percent: κλάσμα (0,25 = 25%)
// date: 'YYYY-MM-DD' · month: 'YYYY-MM'
export type CellType =
  "text" | "integer" | "number" | "money" | "percent" | "date" | "month";

export interface ExportColumn {
  // Η διαδρομή μέσα στη γραμμή του JSON, με τελείες (π.χ. "clientName", "buckets.1").
  key: string;
  header: string;
  type: CellType;
  // Ελληνικές λέξεις για κωδικούς της βάσης (π.χ. { won: "Κερδισμένη" })· άγνωστος κωδικός μένει όπως είναι.
  labels?: Readonly<Record<string, string>>;
}

export type Cell = string | number | null;

export interface SheetColumn {
  header: string;
  type: CellType;
}

export interface ExportSheet {
  name: string;
  columns: readonly SheetColumn[];
  rows: readonly (readonly Cell[])[];
}

const DATE = /^\d{4}-\d{2}-\d{2}/;
const MONTH = /^\d{4}-\d{2}$/;
const NUMERIC_TYPES: readonly CellType[] = [
  "integer",
  "number",
  "money",
  "percent",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// Η τιμή στη διαδρομή «a.b.1» (πίνακες με δείκτη). Ό,τι λείπει = undefined.
export const valueAt = (row: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, part) => {
    if (Array.isArray(current)) return current[Number(part)];
    return isRecord(current) ? current[part] : undefined;
  }, row);

const toNumber = (value: unknown): number | null => {
  const number =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
};

// Ένα κελί από τιμή του JSON. null = κενό κελί (π.χ. ποσό που ο θεατής δεν βλέπει).
export const toCell = (value: unknown, type: CellType): Cell => {
  if (value === null || value === undefined) return null;
  if (NUMERIC_TYPES.includes(type)) return toNumber(value);
  if (type === "date")
    return typeof value === "string" && DATE.test(value)
      ? value.slice(0, 10)
      : null;
  if (type === "month")
    return typeof value === "string" && MONTH.test(value) ? value : null;
  if (typeof value === "string") return value;
  return typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : null;
};

const sheetColumns = (columns: readonly ExportColumn[]): SheetColumn[] =>
  columns.map(({ header, type }) => ({ header, type }));

const labelled = (column: ExportColumn, value: unknown): unknown =>
  column.labels && typeof value === "string" ? (column.labels[value] ?? value) : value;

const rowCells = (columns: readonly ExportColumn[], row: unknown): Cell[] =>
  columns.map((column) => toCell(labelled(column, valueAt(row, column.key)), column.type));

// Γραμμή συνόλων: οι τιμές από το αντικείμενο συνόλων, και ο τίτλος («Σύνολο») στην πρώτη στήλη που μένει κενή.
const totalsCells = (
  columns: readonly ExportColumn[],
  totals: unknown,
  label: string,
): Cell[] => {
  const cells = rowCells(columns, totals);
  const first = cells.findIndex((cell) => cell === null);
  return first === -1
    ? cells
    : cells.map((cell, index) => (index === first ? label : cell));
};

export interface TotalsRow {
  values: unknown;
  label: string;
}

export const toSheet = (
  name: string,
  columns: readonly ExportColumn[],
  rows: readonly unknown[],
  totals?: TotalsRow,
): ExportSheet => ({
  name,
  columns: sheetColumns(columns),
  rows: [
    ...rows.map((row) => rowCells(columns, row)),
    ...(totals ? [totalsCells(columns, totals.values, totals.label)] : []),
  ],
});
