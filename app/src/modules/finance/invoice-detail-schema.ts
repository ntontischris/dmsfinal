import { z } from "zod";

import { INVOICE_KINDS } from "./invoices-view-schema";

// Σχήματα των JSON των invoice_detail και invoices_voided_view (Iε, #154).

export const TRAIL_ACTIONS = ["registered", "corrected", "voided"] as const;
export type TrailAction = (typeof TRAIL_ACTIONS)[number];

export const CHANGE_FIELDS = [
  "number",
  "issueDate",
  "dueDate",
  "net",
  "vat",
  "total",
  "mark",
] as const;
export type ChangeField = (typeof CHANGE_FIELDS)[number];

const changeSchema = z.object({
  field: z.enum(CHANGE_FIELDS),
  from: z.union([z.string(), z.number()]).nullable(),
  to: z.union([z.string(), z.number()]).nullable(),
});

const trailEntrySchema = z.object({
  at: z.string(),
  byName: z.string().nullable(),
  action: z.enum(TRAIL_ACTIONS),
  changes: z.array(changeSchema),
  reason: z.string().nullable(),
});

const invoiceDetailSchema = z.object({
  id: z.string(),
  kind: z.enum(INVOICE_KINDS),
  number: z.string(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  net: z.number(),
  vat: z.number(),
  total: z.number(),
  mark: z.string().nullable(),
  clientId: z.string(),
  clientName: z.string(),
  creditFor: z.string().nullable(),
  creditForNumber: z.string().nullable(),
  voided: z
    .object({ at: z.string(), by: z.string().nullable(), reason: z.string() })
    .nullable(),
  trail: z.array(trailEntrySchema),
  can: z.object({ correct: z.boolean(), void: z.boolean() }),
});

const voidedItemSchema = z.object({
  id: z.string(),
  number: z.string(),
  kind: z.enum(INVOICE_KINDS),
  clientName: z.string(),
  issueDate: z.string(),
  total: z.number(),
  voidedAt: z.string(),
  voidedBy: z.string().nullable(),
  reason: z.string(),
});

export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;
export type TrailEntry = z.infer<typeof trailEntrySchema>;
export type TrailChange = z.infer<typeof changeSchema>;
export type VoidedItem = z.infer<typeof voidedItemSchema>;

export const parseInvoiceDetail = (data: unknown): InvoiceDetail =>
  invoiceDetailSchema.parse(data);
export const parseVoidedInvoices = (data: unknown): VoidedItem[] =>
  z.array(voidedItemSchema).parse(data);
