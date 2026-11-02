// I4 (νέα εμφάνιση): η καθαρή λογική των Εισπράξεων του prototype (`screens/i4-model.tsx`) πάνω στα πραγματικά
// Τιμολόγια (invoices_view) και τις Εισπράξεις (receipts_view). Κατανομή όπως η βάση (authz.invoice_standings):
// οι Εισπράξεις κάθε Πελάτη πάνε στα μη πιστωτικά Τιμολόγια κατά ημερομηνία έκδοσης, παλαιότερο πρώτα.

import type { InvoiceItem } from "../invoices-view-schema";
import type { ReceiptRow } from "../types";

export interface OpenInvoice {
  number: string;
  remaining: number;
}

export interface ReceiptPreview {
  covers: readonly { number: string; amount: number }[];
  surplus: number;
}

const r2 = (value: number): number => Math.round(value * 100) / 100;

// Το invoices_view έρχεται νεότερο πρώτα· η κατανομή θέλει το παλαιότερο πρώτα.
const oldestFirst = (items: readonly InvoiceItem[]): InvoiceItem[] =>
  items
    .filter((item) => item.kind !== "credit")
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        a.item.issueDate.localeCompare(b.item.issueDate) || b.index - a.index,
    )
    .map(({ item }) => item);

// Ανοιχτά Τιμολόγια ανά Πελάτη, από το παλαιότερο (ο χρήστης δεν διαλέγει Τιμολόγιο).
export const openInvoicesByClient = (
  items: readonly InvoiceItem[],
): Readonly<Record<string, readonly OpenInvoice[]>> =>
  oldestFirst(items)
    .filter((item) => item.remaining > 0)
    .reduce<Record<string, OpenInvoice[]>>(
      (acc, item) => ({
        ...acc,
        [item.clientId]: [
          ...(acc[item.clientId] ?? []),
          { number: item.number, remaining: item.remaining },
        ],
      }),
      {},
    );

export const previewOf = (
  open: readonly OpenInvoice[],
  amount: number,
): ReceiptPreview => {
  const result = open.reduce<{
    left: number;
    covers: { number: string; amount: number }[];
  }>(
    (acc, inv) => {
      const used = r2(Math.min(inv.remaining, acc.left));
      return {
        left: r2(acc.left - used),
        covers:
          used > 0
            ? [...acc.covers, { number: inv.number, amount: used }]
            : acc.covers,
      };
    },
    { left: amount, covers: [] },
  );
  return { covers: result.covers, surplus: result.left };
};

export interface Settlement {
  number: string;
  isPaid: boolean;
  left: number;
}

// Για το μήνυμα επιτυχίας: ποιο Τιμολόγιο εξοφλήθηκε, ποιο έμεινε με υπόλοιπο.
export const settlementOf = (
  open: readonly OpenInvoice[],
  amount: number,
): readonly Settlement[] => {
  const { covers } = previewOf(open, amount);
  return covers.map((c) => {
    const left = r2(
      (open.find((o) => o.number === c.number)?.remaining ?? 0) - c.amount,
    );
    return { number: c.number, isPaid: left <= 0, left };
  });
};

// Σε ποιο Τιμολόγιο πήγε κάθε Είσπραξη ενός Πελάτη: με τη σειρά των ημερομηνιών, από το παλαιότερο Τιμολόγιο.
// Οφειλή = ό,τι εξοφλήθηκε + ό,τι μένει (σύνολο μείον πιστωτικά, όπως η βάση).
const targetsOfClient = (
  receipts: readonly ReceiptRow[],
  invoices: readonly InvoiceItem[],
): Record<string, string[]> => {
  const debts = invoices
    .map((item) => ({
      number: item.number,
      remaining: r2(item.paid + item.remaining),
    }))
    .filter((debt) => debt.remaining > 0);
  const ordered = [...receipts].sort((a, b) =>
    a.receivedOn.localeCompare(b.receivedOn),
  );
  return ordered.reduce<{ open: OpenInvoice[]; map: Record<string, string[]> }>(
    (acc, r) => {
      const { covers } = previewOf(acc.open, r.amount);
      const used = (n: string) =>
        covers.find((c) => c.number === n)?.amount ?? 0;
      return {
        open: acc.open
          .map((o) => ({ ...o, remaining: r2(o.remaining - used(o.number)) }))
          .filter((o) => o.remaining > 0),
        map: { ...acc.map, [r.id]: covers.map((c) => c.number) },
      };
    },
    { open: debts, map: {} },
  ).map;
};

// Οι διαγραμμένες Εισπράξεις δεν μετρούν (όπως η βάση) και δεν δείχνουν Τιμολόγιο.
export const receiptTargets = (
  receipts: readonly ReceiptRow[],
  items: readonly InvoiceItem[],
): Readonly<Record<string, readonly string[]>> => {
  const invoices = oldestFirst(items);
  const live = receipts.filter((r) => !r.deleted);
  const clientIds = [...new Set(live.map((r) => r.clientId))];
  return Object.assign(
    {},
    ...clientIds.map((id) =>
      targetsOfClient(
        live.filter((r) => r.clientId === id),
        invoices.filter((item) => item.clientId === id),
      ),
    ),
  );
};
