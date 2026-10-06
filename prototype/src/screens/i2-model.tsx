import type { Invoice } from "@/data/finance";
import {
  allStandings,
  clientScope,
  findInvoice,
  standingsOf,
  type InvoiceStanding,
} from "@/data/finance-access";
import type { RoleId } from "@/data/roles";
import { findClient } from "@/data/sales";

export type InvoiceFilter = "όλα" | "ανεξόφλητα" | "ληξιπρόθεσμα" | "πιστωτικά";

export const INVOICE_FILTERS: readonly InvoiceFilter[] = [
  "όλα",
  "ανεξόφλητα",
  "ληξιπρόθεσμα",
  "πιστωτικά",
];

export const parseFilter = (value: string | undefined): InvoiceFilter =>
  INVOICE_FILTERS.find((f) => f === value) ?? "όλα";

export const clientNameOf = (clientId: string): string =>
  findClient(clientId)?.name ?? clientId;

const matches = (s: InvoiceStanding, filter: InvoiceFilter): boolean => {
  if (filter === "ανεξόφλητα") return s.remaining > 0;
  if (filter === "ληξιπρόθεσμα") return s.status === "ληξιπρόθεσμο";
  if (filter === "πιστωτικά") return s.status === "πιστωτικό";
  return true;
};

const byIssueDesc = (a: InvoiceStanding, b: InvoiceStanding): number =>
  b.invoice.issueDate.localeCompare(a.invoice.issueDate);

export const standingsFor = (role: RoleId): readonly InvoiceStanding[] => {
  const scope = clientScope(role);
  return scope ? standingsOf(scope) : allStandings();
};

export const visibleStandings = (
  all: readonly InvoiceStanding[],
  filter: InvoiceFilter,
): readonly InvoiceStanding[] =>
  all.filter((s) => matches(s, filter)).sort(byIssueDesc);

export const correctedNumberOf = (invoice: Invoice): string | undefined =>
  invoice.creditFor ? findInvoice(invoice.creditFor)?.number : undefined;

export const sumRemaining = (rows: readonly InvoiceStanding[]): number =>
  Math.round(rows.reduce((sum, s) => sum + s.remaining, 0) * 100) / 100;
