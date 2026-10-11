import { z } from "zod";

import { COST_STATES, type CostDetail, type CostRow } from "./types";

// Σχήμα των JSON των RPC ανάγνωσης κόστους (production_costs_view, production_cost_view).
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const estimateSchema = z.object({
  shootHours: z.number(),
  editHours: z.number(),
  directCost: z.number(),
  price: z.number().nullable(),
  cost: z.number(),
});

const actualSchema = z.object({
  shootHours: z.number(),
  shootConfirmed: z.boolean(),
  editHours: z.number(),
  editConfirmed: z.boolean(),
  directCost: z.number(),
  cost: z.number(),
  suggestedShootHours: z.number(),
});

const rowSchema = z.object({
  productionId: z.string(),
  title: z.string(),
  client: z.string().nullable(),
  state: z.enum(COST_STATES),
  estimate: estimateSchema,
  actual: actualSchema,
  hourCost: z.number().nullable(),
  hoursComplete: z.boolean(),
  signals: z.object({ lowMargin: z.boolean(), overrun: z.boolean() }),
});

const detailSchema = rowSchema.extend({ can: z.object({ edit: z.boolean() }) });

export const parseCostRows = (data: unknown): CostRow[] =>
  z.array(rowSchema).parse(data);

export const parseCostDetail = (data: unknown): CostDetail | null => {
  if (data === null) return null;
  const { can, ...row } = detailSchema.parse(data);
  return { ...row, canEdit: can.edit };
};
