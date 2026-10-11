import { z } from "zod";

import { INVOICE_KINDS, INVOICE_STATUSES } from "./invoices-view-schema";

// Σχήματα των JSON των RPC της Καρτέλας (client_ledger_view, client_invoices_view, clients_with_finance). Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά.

export const LEDGER_KINDS = [
  "invoice",
  "receipt_doc",
  "credit",
  "payment",
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

const ledgerEntrySchema = z.object({
  date: z.string(),
  kind: z.enum(LEDGER_KINDS),
  label: z.string(),
  debit: z.number(),
  credit: z.number(),
  running: z.number(),
});

const ledgerSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  balance: z.number(),
  overdue: z.number(),
  entries: z.array(ledgerEntrySchema),
  payment: z
    .object({ holder: z.string(), bank: z.string(), iban: z.string() })
    .nullable(),
  toInvoice: z.object({ amount: z.number(), count: z.number() }).nullable(),
});

const clientInvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  kind: z.enum(INVOICE_KINDS),
  issueDate: z.string(),
  dueDate: z.string().nullable(),
  total: z.number(),
  paid: z.number(),
  remaining: z.number(),
  status: z.enum(INVOICE_STATUSES),
  creditForNumber: z.string().nullable(),
});

const clientInvoicesSchema = z.object({ items: z.array(clientInvoiceSchema) });

const ledgerClientsSchema = z.array(
  z.object({ id: z.string(), name: z.string(), balance: z.number() }),
);

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type LedgerView = z.infer<typeof ledgerSchema>;
export type ClientInvoice = z.infer<typeof clientInvoiceSchema>;
export type ClientInvoicesView = z.infer<typeof clientInvoicesSchema>;
export type LedgerClient = z.infer<typeof ledgerClientsSchema>[number];

export const parseLedger = (data: unknown): LedgerView =>
  ledgerSchema.parse(data);
export const parseClientInvoices = (data: unknown): ClientInvoicesView =>
  clientInvoicesSchema.parse(data);
export const parseLedgerClients = (data: unknown): LedgerClient[] =>
  ledgerClientsSchema.parse(data);
