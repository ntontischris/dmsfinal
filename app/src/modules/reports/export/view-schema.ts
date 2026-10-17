import { z } from "zod";

// Σχήματα των JSON των RPC της Εξαγωγής (export_datasets, export_dataset, export_accountant_pack, export_history).
// Οι γραμμές των συνόλων μένουν «άγνωστες» εδώ: τις διαβάζουν οι στήλες (columns.ts). Ό,τι δεν ταιριάζει σπάει δυνατά.

const periodSchema = z.object({
  code: z.string(),
  label: z.string(),
  from: z.string(),
  to: z.string(),
  through: z.string(),
  isPartial: z.boolean(),
});

const overviewSchema = z.object({
  today: z.string(),
  period: periodSchema,
  items: z.array(
    z.object({
      code: z.string(),
      usesPeriod: z.boolean(),
      rowCount: z.number(),
    }),
  ),
});

const datasetSchema = z.object({
  dataset: z.string(),
  period: periodSchema.nullable(),
  amounts: z.boolean(),
  rows: z.array(z.unknown()),
});

const packInvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  clientName: z.string(),
  pdfPath: z.string().nullable(),
});

const packSchema = z.object({
  month: z.string(),
  isPartial: z.boolean(),
  amounts: z.boolean(),
  pdfs: z.boolean(),
  invoices: z.array(z.unknown()),
  receipts: z.array(z.unknown()),
});

const historyItemSchema = z.object({
  at: z.string(),
  actorName: z.string(),
  isMine: z.boolean(),
  kind: z.string().nullable(),
  subject: z.string().nullable(),
  filters: z.record(z.string(), z.unknown()),
  rows: z.number(),
  format: z.string().nullable(),
});

const historySchema = z.object({
  all: z.boolean(),
  items: z.array(historyItemSchema),
});

// Το JSON μιας Αναφοράς, όσο χρειάζεται για το όνομα του αρχείου.
const reportHeadSchema = z
  .object({
    period: periodSchema.pick({ label: true, from: true, to: true }).optional(),
    client: z.object({ name: z.string() }).nullable().optional(),
    today: z.string().optional(),
  });

export type ExportOverview = z.infer<typeof overviewSchema>;
export type DatasetExport = z.infer<typeof datasetSchema>;
export type PackInvoice = z.infer<typeof packInvoiceSchema>;
export type AccountantPackData = z.infer<typeof packSchema>;
export type ExportHistoryItem = z.infer<typeof historyItemSchema>;
export type ExportHistory = z.infer<typeof historySchema>;
export type ReportHead = z.infer<typeof reportHeadSchema>;

export const parseOverview = (data: unknown): ExportOverview =>
  overviewSchema.parse(data);
export const parseDatasetExport = (data: unknown): DatasetExport =>
  datasetSchema.parse(data);
export const parsePack = (data: unknown): AccountantPackData =>
  packSchema.parse(data);
export const parsePackInvoice = (data: unknown): PackInvoice =>
  packInvoiceSchema.parse(data);
export const parseHistory = (data: unknown): ExportHistory =>
  historySchema.parse(data);
// Το κεφάλι μιας Αναφοράς για το όνομα του αρχείου· ό,τι δεν ταιριάζει απλώς δεν μπαίνει στο όνομα.
export const readReportHead = (data: unknown): ReportHead => {
  const result = reportHeadSchema.safeParse(data);
  return result.success ? result.data : {};
};
