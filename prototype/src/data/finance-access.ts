// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «10 Οικονομικά», και οι υπολογισμοί του:
// κάλυψη Τιμολογητέων από Τιμολόγια (καθαρά, από το παλαιότερο), εξόφληση Τιμολογίων από Εισπράξεις
// (από το παλαιότερο), καταστάσεις, Καρτέλα Πελάτη και Κόστος ώρας.
// Πηγές: 01-roles-and-permissions.md (Οικονομικά), κεφ. 3.7 «Λεπτομέρειες κανόνων: Οικονομικά», κεφ. 3.3, ADR 0004.

import { NOW } from "@/data/filming";
import {
  BILLABLES,
  INVOICES,
  MONTH_COSTS,
  RECEIPTS,
  type Billable,
  type Invoice,
  type MonthCost,
  type Receipt,
} from "@/data/finance";
import type { RoleId } from "@/data/roles";
import { KYPSELI_ID } from "@/data/sales";

export const TODAY = NOW.slice(0, 10);

export interface FinanceCaps {
  canSee: boolean;
  isClient: boolean;
  isReadOnly: boolean;
  canRegisterInvoices: boolean;
  canRegisterReceipts: boolean;
  canSeeCost: boolean;
  canManageCost: boolean;
  canManageSettings: boolean;
}

// «Καταχωρεί Τιμολόγια» αρχικά μόνο ο Ιδιοκτήτης. Ο Λογιστής βλέπει ποσά, μόνο ανάγνωση.
export const financeCapsOf = (role: RoleId): FinanceCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  return {
    canSee: isAdminLike || role === "accountant" || role === "client",
    isClient: role === "client",
    isReadOnly: role === "accountant" || role === "client",
    canRegisterInvoices: role === "owner",
    canRegisterReceipts: isAdminLike,
    canSeeCost: isAdminLike,
    canManageCost: role === "owner",
    canManageSettings: isAdminLike,
  };
};

// Ο πελάτης βλέπει μόνο τα δικά του (Κυψέλη Καφέ).
export const clientScope = (role: RoleId): string | null =>
  financeCapsOf(role).isClient ? KYPSELI_ID : null;

const r2 = (value: number): number => Math.round(value * 100) / 100;
const byDate =
  <T>(key: (item: T) => string) =>
  (a: T, b: T): number =>
    key(a).localeCompare(key(b));

export const liveInvoices = (clientId?: string): readonly Invoice[] =>
  INVOICES.filter((i) => !i.voided && (!clientId || i.clientId === clientId));

export const findInvoice = (id: string): Invoice | undefined =>
  INVOICES.find((i) => i.id === id);

export const isCredit = (invoice: Invoice): boolean =>
  invoice.kind === "πιστωτικό";

// Πόσο από κάθε Τιμολογητέο έχουν καλύψει τα καθαρά των Τιμολογίων, από το παλαιότερο. Τα πιστωτικά δεν ξανανοίγουν τίποτα.
export interface BillableCoverage {
  billable: Billable;
  covered: number;
  open: number;
}

export const coverageOf = (clientId: string): readonly BillableCoverage[] => {
  const invoicedNet = liveInvoices(clientId)
    .filter((i) => !isCredit(i))
    .reduce((sum, i) => sum + i.net, 0);
  const sorted = BILLABLES.filter((b) => b.clientId === clientId).sort(
    byDate((b) => b.date),
  );
  return sorted.reduce<{ left: number; rows: BillableCoverage[] }>(
    (acc, billable) => {
      const covered = Math.min(billable.net, acc.left);
      return {
        left: acc.left - covered,
        rows: [
          ...acc.rows,
          { billable, covered, open: r2(billable.net - covered) },
        ],
      };
    },
    { left: invoicedNet, rows: [] },
  ).rows;
};

export const openBillables = (clientId: string): readonly BillableCoverage[] =>
  coverageOf(clientId).filter((row) => row.open > 0);

export const toInvoiceOf = (clientId: string): number =>
  r2(openBillables(clientId).reduce((sum, row) => sum + row.open, 0));

// Τιμολογήθηκε πέρα από τα Τιμολογητέα (π.χ. τιμολόγιο πριν γεννηθεί το Τιμολογητέο): μόνο ένδειξη.
export const invoicedBeyondOf = (clientId: string): number => {
  const billed = BILLABLES.filter((b) => b.clientId === clientId).reduce((s, b) => s + b.net, 0);
  const invoiced = liveInvoices(clientId).reduce((s, i) => s + (isCredit(i) ? -i.net : i.net), 0);
  return r2(Math.max(0, invoiced - billed));
};

export const ageInDays = (date: string, today = TODAY): number =>
  Math.floor((Date.parse(today) - Date.parse(date)) / 86_400_000);

export type InvoiceStatus =
  | "ανεξόφλητο"
  | "μερικώς εξοφλημένο"
  | "ληξιπρόθεσμο"
  | "εξοφλημένο"
  | "πιστωτικό";

export interface InvoiceStanding {
  invoice: Invoice;
  owed: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
}

// Ποσό προς πληρωμή = σύνολο μείον τα πιστωτικά που είναι δεμένα μαζί του.
const owedOf = (invoice: Invoice): number =>
  r2(
    invoice.total -
      liveInvoices(invoice.clientId)
        .filter((c) => c.creditFor === invoice.id)
        .reduce((sum, c) => sum + c.total, 0),
  );

const statusOf = (
  invoice: Invoice,
  paid: number,
  owed: number,
): InvoiceStatus => {
  if (paid >= owed) return "εξοφλημένο";
  if (invoice.dueDate && invoice.dueDate < TODAY) return "ληξιπρόθεσμο";
  return paid > 0 ? "μερικώς εξοφλημένο" : "ανεξόφλητο";
};

// Οι Εισπράξεις (μαζί και όσες ήρθαν πριν από το Τιμολόγιο) εξοφλούν από το παλαιότερο Τιμολόγιο.
export const standingsOf = (clientId: string): readonly InvoiceStanding[] => {
  const pool = RECEIPTS.filter((r) => r.clientId === clientId).reduce(
    (s, r) => s + r.amount,
    0,
  );
  const debts = liveInvoices(clientId)
    .filter((i) => !isCredit(i))
    .sort(byDate((i) => i.issueDate));
  const paidRows = debts.reduce<{ left: number; rows: InvoiceStanding[] }>(
    (acc, invoice) => {
      const owed = owedOf(invoice);
      const paid = r2(Math.min(owed, acc.left));
      const row = {
        invoice,
        owed,
        paid,
        remaining: r2(owed - paid),
        status: statusOf(invoice, paid, owed),
      };
      return { left: r2(acc.left - paid), rows: [...acc.rows, row] };
    },
    { left: pool, rows: [] },
  ).rows;
  const credits = liveInvoices(clientId)
    .filter(isCredit)
    .map((invoice) => ({
      invoice,
      owed: 0,
      paid: 0,
      remaining: 0,
      status: "πιστωτικό" as const,
    }));
  return [...paidRows, ...credits];
};

export const allStandings = (): readonly InvoiceStanding[] =>
  [...new Set(INVOICES.map((i) => i.clientId))].flatMap(standingsOf);

export interface LedgerRow {
  date: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
  ref?: string;
}

// Καρτέλα: Τιμολόγια χρεώνουν, πιστωτικά και Εισπράξεις πιστώνουν. Αρνητικό υπόλοιπο = «υπόλοιπο υπέρ του πελάτη».
export const ledgerOf = (clientId: string): readonly LedgerRow[] => {
  const moves = [
    ...liveInvoices(clientId).map((i) => ({
      date: i.issueDate,
      label: `${i.kind === "πιστωτικό" ? "Πιστωτικό" : i.kind === "απόδειξη" ? "Απόδειξη" : "Τιμολόγιο"} ${i.number}`,
      debit: isCredit(i) ? 0 : i.total,
      credit: isCredit(i) ? i.total : 0,
      ref: i.id,
    })),
    ...RECEIPTS.filter((r: Receipt) => r.clientId === clientId).map((r) => ({
      date: r.date,
      label: r.note ? `Είσπραξη (${r.note})` : "Είσπραξη",
      debit: 0,
      credit: r.amount,
      ref: r.id,
    })),
  ].sort(byDate((m) => m.date));
  return moves.reduce<LedgerRow[]>((rows, move) => {
    const previous = rows.at(-1)?.balance ?? 0;
    return [
      ...rows,
      { ...move, balance: r2(previous + move.debit - move.credit) },
    ];
  }, []);
};

export const balanceOf = (clientId: string): number =>
  ledgerOf(clientId).at(-1)?.balance ?? 0;

export const overdueOf = (clientId: string): number =>
  r2(
    standingsOf(clientId)
      .filter((s) => s.status === "ληξιπρόθεσμο")
      .reduce((sum, s) => sum + s.remaining, 0),
  );

// Τζίρος: καθαρά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης.
export const revenueOf = (fromDate: string, toDate: string): number =>
  r2(
    liveInvoices()
      .filter((i) => i.issueDate >= fromDate && i.issueDate <= toDate)
      .reduce((sum, i) => sum + (isCredit(i) ? -i.net : i.net), 0),
  );

export const monthTotal = (month: MonthCost): number =>
  month.categories.reduce(
    (sum, c) =>
      sum +
      c.items.reduce(
        (s, i) => s + i.lines.reduce((t, l) => t + l.amount, 0),
        0,
      ),
    0,
  );

export const hourCostOf = (month: MonthCost): number =>
  Math.round((monthTotal(month) / month.productiveHours) * 100) / 100;

// Ένας μήνας κλείνει αυτόματα όταν τελειώσει. Αλλάζουν μόνο ο τρέχων και οι επόμενοι.
export const isClosedMonth = (month: string): boolean =>
  month < TODAY.slice(0, 7);

export const findMonthCost = (month: string): MonthCost | undefined =>
  MONTH_COSTS.find((m) => m.month === month);
