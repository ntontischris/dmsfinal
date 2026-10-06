import { PAYMENT_METHODS, RECEIPTS, type Receipt } from "@/data/finance";
import { standingsOf } from "@/data/finance-access";
import { SALES_CLIENTS } from "@/data/sales";

export interface OpenInvoice {
  number: string;
  remaining: number;
}

export interface ClientOption {
  id: string;
  name: string;
}

export interface ReceiptPreview {
  covers: readonly { number: string; amount: number }[];
  surplus: number;
}

const r2 = (value: number): number => Math.round(value * 100) / 100;

export const clientOptions = (): readonly ClientOption[] =>
  SALES_CLIENTS.map((c) => ({ id: c.id, name: c.name }));

export const activeMethods = () => PAYMENT_METHODS.filter((m) => m.isActive);

export const receiptsDesc = (): readonly Receipt[] =>
  [...RECEIPTS].sort((a, b) => b.date.localeCompare(a.date));

// Ανοιχτά Τιμολόγια ανά Πελάτη, από το παλαιότερο (ο χρήστης δεν διαλέγει Τιμολόγιο).
export const openInvoicesByClient = (): Readonly<
  Record<string, readonly OpenInvoice[]>
> =>
  Object.fromEntries(
    SALES_CLIENTS.map((c) => [
      c.id,
      standingsOf(c.id)
        .filter((s) => s.remaining > 0)
        .sort((a, b) => a.invoice.issueDate.localeCompare(b.invoice.issueDate))
        .map((s) => ({ number: s.invoice.number, remaining: s.remaining })),
    ]),
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
