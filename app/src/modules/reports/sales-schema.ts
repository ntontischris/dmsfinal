import { z } from "zod";

import { periodSchema } from "./view-schema";

// Σχήματα των JSON των RPC των Αναφορών πωλήσεων (report_sales_pipeline, report_sales_results, report_sales_sources).
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά. Τα ποσά είναι null χωρίς «Βλέπει ποσά»· managerName null = «Χωρίς υπεύθυνο».

const amount = z.number().nullable();
const kind = z.enum(["monthly", "one_off"]).nullable();
const sellerRefSchema = z.object({ id: z.string(), name: z.string() });

// Κοινή κεφαλίδα: Εύρος και φίλτρο Πωλητή (Ρ4).
const sellerHeader = {
  isScoped: z.boolean(),
  showSeller: z.boolean(),
  seller: sellerRefSchema.nullable(),
  sellers: z.array(sellerRefSchema),
};

const stageSchema = z.object({
  stageId: z.string(),
  label: z.string(),
  count: z.number(),
  monthly: amount,
  oneOff: amount,
  withoutProposal: z.number(),
});

const openRowSchema = z.object({
  opportunityId: z.string(),
  title: z.string(),
  clientName: z.string(),
  stageId: z.string(),
  stageLabel: z.string(),
  managerName: z.string().nullable(),
  kind,
  value: amount,
  nextStepDue: z.string().nullable(),
});

const pipelineSchema = z.object({
  ...sellerHeader,
  amounts: z.boolean(),
  stages: z.array(stageSchema),
  rows: z.array(openRowSchema),
  totals: stageSchema.pick({
    count: true,
    monthly: true,
    oneOff: true,
    withoutProposal: true,
  }),
});

const closedRowSchema = z.object({
  opportunityId: z.string(),
  title: z.string(),
  clientName: z.string(),
  managerName: z.string().nullable(),
  outcome: z.enum(["won", "lost"]),
  closedOn: z.string(),
  lossReason: z.string().nullable(),
  kind,
  value: amount,
});

const resultsSchema = z.object({
  ...sellerHeader,
  period: periodSchema,
  amounts: z.boolean(),
  totals: z.object({
    won: z.number(),
    lost: z.number(),
    winRate: z.number().nullable(),
    wonMonthly: amount,
    wonOneOff: amount,
  }),
  lossReasons: z.array(
    z.object({ reasonId: z.string(), label: z.string(), count: z.number() }),
  ),
  rows: z.array(closedRowSchema),
});

const sourceCountsSchema = z.object({
  opened: z.number(),
  open: z.number(),
  won: z.number(),
  lost: z.number(),
  winRate: z.number().nullable(),
});

const sourcesSchema = z.object({
  ...sellerHeader,
  period: periodSchema,
  rows: z.array(
    sourceCountsSchema.extend({ sourceId: z.string(), label: z.string() }),
  ),
  totals: sourceCountsSchema,
  opportunities: z.array(
    z.object({
      opportunityId: z.string(),
      title: z.string(),
      clientName: z.string(),
      sourceLabel: z.string(),
      managerName: z.string().nullable(),
      outcome: z.enum(["open", "won", "lost"]),
      createdOn: z.string(),
    }),
  ),
});

export type SellerRef = z.infer<typeof sellerRefSchema>;
export type OpportunityKind = z.infer<typeof kind>;
export type SalesPipeline = z.infer<typeof pipelineSchema>;
export type SalesOpenRow = z.infer<typeof openRowSchema>;
export type SalesResults = z.infer<typeof resultsSchema>;
export type SalesClosedRow = z.infer<typeof closedRowSchema>;
export type SalesSources = z.infer<typeof sourcesSchema>;

export const parseSalesPipeline = (data: unknown): SalesPipeline =>
  pipelineSchema.parse(data);
export const parseSalesResults = (data: unknown): SalesResults =>
  resultsSchema.parse(data);
export const parseSalesSources = (data: unknown): SalesSources =>
  sourcesSchema.parse(data);
