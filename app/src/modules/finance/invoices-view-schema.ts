import { z } from "zod";

// Σχήματα των JSON των RPC των Τιμολογίων (invoices_view, invoice_draft_context). Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά.

export const INVOICE_FILTERS = ["all", "unpaid", "overdue", "credit"] as const;
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];

export const INVOICE_KINDS = ["invoice", "receipt", "credit"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = ["unpaid", "partial", "overdue", "paid", "credit"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const invoiceItemSchema = z.object({
  id: z.string(),
  number: z.string(),
  kind: z.enum(INVOICE_KINDS),
  clientId: z.string(),
  clientName: z.string(),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  total: z.number(),
  paid: z.number(),
  remaining: z.number(),
  status: z.enum(INVOICE_STATUSES),
  creditForNumber: z.string().nullable(),
});

const invoicesViewSchema = z.object({
  totals: z.object({
    turnoverMonth: z.number(),
    unpaid: z.number(),
    unpaidCount: z.number(),
    overdue: z.number(),
    overdueCount: z.number(),
  }),
  counts: z.object({ all: z.number(), unpaid: z.number(), overdue: z.number(), credit: z.number() }),
  items: z.array(invoiceItemSchema),
});

const invoiceContextSchema = z.object({
  clientName: z.string(),
  clientTaxId: z.string().nullable(),
  vatRate: z.number(),
  paymentDays: z.number(),
  toInvoice: z.number(),
  openBillables: z.array(
    z.object({ id: z.string(), label: z.string(), billableOn: z.string(), open: z.number() }),
  ),
  existingNumbers: z.array(z.string()),
  invoices: z.array(z.object({ id: z.string(), number: z.string(), kind: z.enum(INVOICE_KINDS) })),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type InvoicesView = z.infer<typeof invoicesViewSchema>;
export type InvoiceContext = z.infer<typeof invoiceContextSchema>;
export type OpenBillable = InvoiceContext["openBillables"][number];

export const parseInvoicesView = (data: unknown): InvoicesView => invoicesViewSchema.parse(data);
export const parseInvoiceContext = (data: unknown): InvoiceContext => invoiceContextSchema.parse(data);
