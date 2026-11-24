import { z } from "zod";

// Τ8: τα σχήματα και ο κανόνας μήνα για τα χρήματα της Σήμερα, από τα ίδια RPC με τις κάρτες των Τιμολογίων.

const billablesTotalSchema = z.object({ total: z.number() });

const receiptRowSchema = z.object({
  receivedOn: z.string(),
  amount: z.number(),
  deleted: z.boolean(),
});

export type ReceiptAmount = z.output<typeof receiptRowSchema>;

export const parseBillablesTotal = (data: unknown): number =>
  billablesTotalSchema.parse(data).total;

export const parseReceiptAmounts = (data: unknown): ReceiptAmount[] =>
  z.array(receiptRowSchema).parse(data);

// Πόσα μπήκαν τον μήνα (month = "YYYY-MM"), χωρίς τις διαγραμμένες: ο ίδιος κανόνας με το receiptsIn των Τιμολογίων.
export const receivedInMonth = (
  receipts: readonly ReceiptAmount[],
  month: string,
): number =>
  Math.round(
    receipts
      .filter((r) => !r.deleted && r.receivedOn.startsWith(month))
      .reduce((sum, r) => sum + r.amount, 0) * 100,
  ) / 100;
