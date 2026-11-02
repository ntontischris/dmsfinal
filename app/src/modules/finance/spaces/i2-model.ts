// I2 (νέα εμφάνιση): η καθαρή λογική της λίστας Τιμολογίων του prototype (`screens/i2-model.tsx`, `i2-invoice-facts.ts`)
// πάνω στις πραγματικές γραμμές του invoices_view. Τα φίλτρα κάνουν ό,τι και η βάση (ίδιοι κανόνες με το p_filter).

import type { ReceiptRow } from "../types";
import type { InvoiceFilter, InvoiceItem } from "../invoices-view-schema";

const MONTH_NAMES = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

// «2026-09» → «Σεπτέμβριος 2026».
export const fmtMonth = (month: string): string => {
  const [year, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
};

// «τον Σεπτέμβριο»: αιτιατική από την ονομαστική.
export const monthName = (month: string): string =>
  fmtMonth(month).split(" ")[0].replace(/ς$/, "");

export const versus = (now: number, before: number): string =>
  now > before ? "↑" : now < before ? "↓" : "=";

// Ίδιοι κανόνες με το invoices_view(p_filter).
export const matchesFilter = (
  row: InvoiceItem,
  filter: InvoiceFilter,
): boolean => {
  if (filter === "unpaid") return row.kind !== "credit" && row.remaining > 0;
  if (filter === "overdue") return row.status === "overdue";
  if (filter === "credit") return row.kind === "credit";
  return true;
};

const byIssueDesc = (a: InvoiceItem, b: InvoiceItem): number =>
  b.issueDate.localeCompare(a.issueDate);

export const visibleInvoices = (
  all: readonly InvoiceItem[],
  filter: InvoiceFilter,
): readonly InvoiceItem[] =>
  all.filter((row) => matchesFilter(row, filter)).sort(byIssueDesc);

// Οι μήνες έκδοσης που έχουν Τιμολόγια, νεότερος πρώτος (για το φίλτρο μήνα).
export const invoiceMonthsOf = (
  all: readonly InvoiceItem[],
): readonly string[] =>
  [...new Set(all.map((row) => row.issueDate.slice(0, 7)))].sort().reverse();

export const byMonth = (
  all: readonly InvoiceItem[],
  month: string | undefined,
): readonly InvoiceItem[] =>
  month ? all.filter((row) => row.issueDate.startsWith(month)) : all;

export const byClient = (
  all: readonly InvoiceItem[],
  clientId: string | undefined,
): readonly InvoiceItem[] =>
  clientId ? all.filter((row) => row.clientId === clientId) : all;

export interface ClientChoice {
  id: string;
  name: string;
}

// Φίλτρο Πελάτη: μόνο όσοι Πελάτες έχουν Τιμολόγια, αλφαβητικά.
export const clientsWithInvoices = (
  all: readonly InvoiceItem[],
): readonly ClientChoice[] =>
  [...new Map(all.map((row) => [row.clientId, row.clientName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "el"));

// «Από τα 2 ανεξόφλητα, 1 έχει λήξει»: εξηγεί τη διαφορά ανάμεσα στα δύο φίλτρα.
export const unpaidNoteOf = (all: readonly InvoiceItem[]): string | null => {
  const unpaid = all.filter((row) => matchesFilter(row, "unpaid")).length;
  if (unpaid === 0) return null;
  const overdue = all.filter((row) => row.status === "overdue").length;
  const head =
    unpaid === 1 ? "Από το 1 ανεξόφλητο" : `Από τα ${unpaid} ανεξόφλητα`;
  const late =
    overdue === 0
      ? "κανένα δεν έχει λήξει"
      : overdue === 1
        ? "1 έχει λήξει (ληξιπρόθεσμο)"
        : `${overdue} έχουν λήξει (ληξιπρόθεσμα)`;
  const rest = unpaid - overdue;
  const tail =
    overdue === 0 || rest === 0
      ? ""
      : rest === 1
        ? "· το άλλο δεν έχει λήξει ακόμα"
        : `· τα άλλα ${rest} δεν έχουν λήξει ακόμα`;
  return `${head}, ${late}${tail}.`;
};

const ageInDays = (date: string, today: string): number =>
  Math.floor((Date.parse(today) - Date.parse(date)) / 86_400_000);

const days = (n: number): string => (n === 1 ? "1 μέρα" : `${n} μέρες`);

// «καθυστερεί 32 μέρες» ή «λήγει σε 3 μέρες»· null όταν δεν χρωστιέται τίποτα.
export const dueNoteOf = (row: InvoiceItem, today: string): string | null => {
  const due = row.dueDate;
  if (!due || row.remaining <= 0) return null;
  const late = ageInDays(due, today);
  if (late > 0) return `καθυστερεί ${days(late)}`;
  if (late === 0) return "λήγει σήμερα";
  if (late === -1) return "λήγει αύριο";
  return `λήγει σε ${days(-late)}`;
};

const r2 = (value: number): number => Math.round(value * 100) / 100;

export const previousMonthOf = (month: string): string => {
  const date = new Date(`${month}-15T12:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
};

// Οι Εισπράξεις ενός μήνα (χωρίς τις διαγραμμένες).
export const receiptsIn = (
  receipts: readonly ReceiptRow[],
  month: string,
): number =>
  r2(
    receipts
      .filter((r) => !r.deleted && r.receivedOn.startsWith(month))
      .reduce((sum, r) => sum + r.amount, 0),
  );
