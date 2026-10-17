import { z } from "zod";

// Σχήματα των JSON των RPC των Αναφορών (report_periods, report_turnover_monthly, report_turnover_by_client,
// report_receivables_aging). Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά. Τα ποσά είναι null χωρίς «Βλέπει ποσά».

const amount = z.number().nullable();

export const periodSchema = z.object({
  code: z.string(),
  label: z.string(),
  from: z.string(),
  to: z.string(),
  through: z.string(),
  isPartial: z.boolean(),
});

const periodsSchema = z.object({
  today: z.string(),
  default: z.string(),
  items: z.array(periodSchema),
});

const clientRefSchema = z.object({ id: z.string(), name: z.string() });

const turnoverMonthSchema = z.object({
  month: z.string(),
  turnover: amount,
  invoiceCount: z.number(),
  creditCount: z.number(),
  collections: amount,
  receiptCount: z.number(),
  isPartial: z.boolean(),
});

const turnoverMonthlySchema = z.object({
  period: periodSchema,
  amounts: z.boolean(),
  client: clientRefSchema.nullable(),
  clients: z.array(clientRefSchema),
  months: z.array(turnoverMonthSchema),
  totals: turnoverMonthSchema.omit({ month: true, isPartial: true }),
});

const turnoverClientSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  turnover: amount,
  share: amount,
  invoiceCount: z.number(),
  creditCount: z.number(),
});

const turnoverByClientSchema = z.object({
  period: periodSchema,
  amounts: z.boolean(),
  rows: z.array(turnoverClientSchema),
  totals: turnoverClientSchema.pick({
    turnover: true,
    invoiceCount: true,
    creditCount: true,
  }),
});

const fiveAmounts = z.array(amount).length(5);
const fiveCounts = z.array(z.number()).length(5);

const agingRowSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  buckets: fiveAmounts,
  counts: fiveCounts,
  total: amount,
  invoiceCount: z.number(),
  oldestDue: z.string().nullable(),
});

const agingSchema = z.object({
  today: z.string(),
  amounts: z.boolean(),
  rows: z.array(agingRowSchema),
  totals: z.object({
    buckets: fiveAmounts,
    counts: fiveCounts,
    total: amount,
    overdue: amount,
    invoiceCount: z.number(),
  }),
});

export type ReportPeriod = z.infer<typeof periodSchema>;
export type ReportPeriods = z.infer<typeof periodsSchema>;
export type ClientRef = z.infer<typeof clientRefSchema>;
export type TurnoverMonth = z.infer<typeof turnoverMonthSchema>;
export type TurnoverMonthly = z.infer<typeof turnoverMonthlySchema>;
export type TurnoverClientRow = z.infer<typeof turnoverClientSchema>;
export type TurnoverByClient = z.infer<typeof turnoverByClientSchema>;
export type AgingRow = z.infer<typeof agingRowSchema>;
export type ReceivablesAging = z.infer<typeof agingSchema>;

export const parsePeriods = (data: unknown): ReportPeriods =>
  periodsSchema.parse(data);
export const parseTurnoverMonthly = (data: unknown): TurnoverMonthly =>
  turnoverMonthlySchema.parse(data);
export const parseTurnoverByClient = (data: unknown): TurnoverByClient =>
  turnoverByClientSchema.parse(data);
export const parseReceivablesAging = (data: unknown): ReceivablesAging =>
  agingSchema.parse(data);
