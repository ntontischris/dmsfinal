import { z } from "zod";

import type { PaymentMethod, ReceiptPreview, ReceiptRow } from "./types";

// Σχήμα των JSON των RPC του module (receipts_view, payment_methods_view, receipt_preview).
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const receiptSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  receivedOn: z.string(),
  amount: z.number(),
  methodId: z.string(),
  methodLabel: z.string(),
  note: z.string(),
  createdByName: z.string(),
  deleted: z.boolean(),
  deleteReason: z.string().nullable(),
  can: z.object({ edit: z.boolean() }),
});

const methodSchema = z.object({
  id: z.string(),
  label: z.string(),
  retired: z.boolean(),
});

const previewSchema = z.object({
  settles: z.array(z.object({ invoiceId: z.string(), number: z.string(), amount: z.number() })),
  surplus: z.number(),
});

export const parseReceipts = (data: unknown): ReceiptRow[] =>
  z.array(receiptSchema).parse(data).map(({ can, ...row }) => ({ ...row, canEdit: can.edit }));

export const parseMethods = (data: unknown): PaymentMethod[] => z.array(methodSchema).parse(data);

export const parsePreview = (data: unknown): ReceiptPreview => previewSchema.parse(data);
