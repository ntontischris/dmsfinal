// I4 (νέα εμφάνιση): η καθαρή λογική των Εισπράξεων του prototype (`screens/i4-model.tsx`) πάνω στα πραγματικά
// Τιμολόγια (invoices_view) και τις Εισπράξεις (receipts_view). Κατανομή όπως η βάση (authz.invoice_standings):
// κάθε Είσπραξη (ποσό + παρακράτηση) πάει πρώτα στα Τιμολόγια που δέθηκαν μαζί της (d4) και ό,τι περισσεύει στα μη
// πιστωτικά Τιμολόγια κατά ημερομηνία έκδοσης, παλαιότερο πρώτα (authz.receipt_applications).

import type { InvoiceItem } from "../invoices-view-schema";
import type { ReceiptRow } from "../types";

export interface OpenInvoice {
  id: string;
  number: string;
  remaining: number;
  // Το καθαρό του Τιμολογίου: η παρακράτηση προτείνεται ως ποσοστό του (0 όταν δεν το ξέρουμε).
  net: number;
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
          {
            id: item.id,
            number: item.number,
            remaining: item.remaining,
            net: item.net ?? 0,
          },
        ],
      }),
      {},
    );

// Τα δεμένα Τιμολόγια μπαίνουν πρώτα (με τη σειρά τους), μετά τα υπόλοιπα από το παλαιότερο.
const linkedFirst = <T extends { id: string }>(
  open: readonly T[],
  linked: readonly string[],
): T[] => [
  ...open.filter((inv) => linked.includes(inv.id)),
  ...open.filter((inv) => !linked.includes(inv.id)),
];

export const previewOf = (
  open: readonly Pick<OpenInvoice, "number" | "remaining">[],
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

// Η προεπισκόπηση της φόρμας: αξία = ποσό + παρακράτηση, πρώτα τα δεμένα Τιμολόγια.
export const linkedPreviewOf = (
  open: readonly OpenInvoice[],
  value: number,
  linked: readonly string[],
): ReceiptPreview => previewOf(linkedFirst(open, linked), value);

// Η πρόταση παρακράτησης: ποσοστό του καθαρού των δεμένων Τιμολογίων (χωρίς δεμένα, τίποτα).
export const suggestedWithholding = (
  open: readonly OpenInvoice[],
  linked: readonly string[],
  percent: number,
): number =>
  r2(
    (open
      .filter((inv) => linked.includes(inv.id))
      .reduce((sum, inv) => sum + inv.net, 0) *
      percent) /
      100,
  );

// Για το μήνυμα επιτυχίας: ποιο Τιμολόγιο εξοφλήθηκε, ποιο έμεινε με υπόλοιπο.
export const settlementOf = (
  open: readonly OpenInvoice[],
  amount: number,
  linked: readonly string[] = [],
): readonly Settlement[] => {
  const { covers } = linkedPreviewOf(open, amount, linked);
  return covers.map((c) => {
    const left = r2(
      (open.find((o) => o.number === c.number)?.remaining ?? 0) - c.amount,
    );
    return { number: c.number, isPaid: left <= 0, left };
  });
};

interface Debt {
  id: string;
  number: string;
  remaining: number;
}

const valueOf = (r: ReceiptRow): number => r2(r.amount + r.withheld);

const reduceDebts = (
  debts: readonly Debt[],
  covers: ReceiptPreview["covers"],
): Debt[] =>
  debts
    .map((d) => ({
      ...d,
      remaining: r2(
        d.remaining - (covers.find((c) => c.number === d.number)?.amount ?? 0),
      ),
    }))
    .filter((d) => d.remaining > 0);

interface Pass {
  open: Debt[];
  map: Record<string, string[]>;
  left: Record<string, number>;
}

// 1ο πέρασμα: κάθε Είσπραξη (με σειρά ημερομηνίας) στα δικά της δεμένα Τιμολόγια.
const linkedPass = (ordered: readonly ReceiptRow[], debts: Debt[]): Pass =>
  ordered.reduce<Pass>(
    (acc, r) => {
      const mine = acc.open.filter((d) => r.invoiceIds.includes(d.id));
      const { covers, surplus } = previewOf(mine, valueOf(r));
      return {
        open: reduceDebts(acc.open, covers),
        map: { ...acc.map, [r.id]: covers.map((c) => c.number) },
        left: { ...acc.left, [r.id]: surplus },
      };
    },
    { open: debts, map: {}, left: {} },
  );

// 2ο πέρασμα: ό,τι περίσσεψε από κάθε Είσπραξη, από το παλαιότερο ανοιχτό Τιμολόγιο.
const restPass = (ordered: readonly ReceiptRow[], first: Pass): Pass =>
  ordered.reduce<Pass>((acc, r) => {
    const { covers } = previewOf(acc.open, acc.left[r.id] ?? 0);
    const before = acc.map[r.id] ?? [];
    return {
      ...acc,
      open: reduceDebts(acc.open, covers),
      map: {
        ...acc.map,
        [r.id]: [
          ...before,
          ...covers.map((c) => c.number).filter((n) => !before.includes(n)),
        ],
      },
    };
  }, first);

// Σε ποιο Τιμολόγιο πήγε κάθε Είσπραξη ενός Πελάτη. Οφειλή = ό,τι εξοφλήθηκε + ό,τι μένει (σύνολο μείον πιστωτικά).
const targetsOfClient = (
  receipts: readonly ReceiptRow[],
  invoices: readonly InvoiceItem[],
): Record<string, string[]> => {
  const debts = invoices
    .map((item) => ({
      id: item.id,
      number: item.number,
      remaining: r2(item.paid + item.remaining),
    }))
    .filter((debt) => debt.remaining > 0);
  const ordered = [...receipts].sort((a, b) =>
    a.receivedOn.localeCompare(b.receivedOn),
  );
  return restPass(ordered, linkedPass(ordered, debts)).map;
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
