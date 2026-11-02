// I5 (νέα εμφάνιση): η πραγματική Καρτέλα (client_ledger_view) στις γραμμές του prototype (`data/finance-access.ts`
// ledgerOf), με την κατάσταση κάθε Τιμολογίου από το invoices_view. Καθαρές συναρτήσεις.

import { STATUS_LABELS } from "../invoices-labels";
import type { InvoiceItem } from "../invoices-view-schema";
import type { LedgerClient, LedgerEntry } from "../ledger-view-schema";

export interface I5Row {
  key: string;
  date: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
  // Μόνο στα Τιμολόγια: πόσα μένουν από αυτό το ίδιο (όχι από τον λογαριασμό).
  invoiceRemaining?: number;
  invoiceStatus?: string;
}

// Η ετικέτα που γράφει η βάση στην Καρτέλα για ένα Τιμολόγιο ή μια Απόδειξη (client_ledger_view: «Τιμολόγιο Α-58»).
const ledgerLabelOf = (item: InvoiceItem): string =>
  `${item.kind === "receipt" ? "Απόδειξη" : "Τιμολόγιο"} ${item.number}`;

const DEBT_KINDS: ReadonlySet<LedgerEntry["kind"]> = new Set([
  "invoice",
  "receipt_doc",
]);

// invoices = null όταν δεν φόρτωσαν: οι γραμμές μένουν χωρίς κατάσταση Τιμολογίου.
export const i5RowsOf = (
  entries: readonly LedgerEntry[],
  clientId: string,
  invoices: readonly InvoiceItem[] | null,
): I5Row[] => {
  const byLabel = new Map(
    (invoices ?? [])
      .filter((item) => item.clientId === clientId && item.kind !== "credit")
      .map((item) => [ledgerLabelOf(item), item]),
  );
  return entries.map((entry, index) => {
    const row: I5Row = {
      key: `${index}-${entry.date}-${entry.label}`,
      date: entry.date,
      label: entry.label,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.running,
    };
    const item = DEBT_KINDS.has(entry.kind)
      ? byLabel.get(entry.label)
      : undefined;
    return item
      ? {
          ...row,
          invoiceRemaining: item.remaining,
          invoiceStatus: STATUS_LABELS[item.status],
        }
      : row;
  });
};

// Ποιος Πελάτης φαίνεται: ο ?client= αν είναι έγκυρος, αλλιώς ο πρώτος της λίστας (όπως το prototype).
export const i5ClientIdOf = (
  param: string | undefined,
  clients: readonly LedgerClient[],
): string | undefined => param ?? clients[0]?.id;
