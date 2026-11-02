import { z } from "zod";

// Σχήματα των JSON των RPC cost_expenses_view (I6) και profitability_view (I7). Ό,τι δεν ταιριάζει σπάει εδώ.

const lineSchema = z.object({ label: z.string(), amount: z.number() });
const itemSchema = z.object({ name: z.string(), lines: z.array(lineSchema) });
const categorySchema = z.object({
  name: z.string(),
  items: z.array(itemSchema),
});

export type ExpenseCategory = z.infer<typeof categorySchema>;

const monthSchema = z.object({
  month: z.string(),
  isClosed: z.boolean(),
  canEdit: z.boolean(),
  saved: z
    .object({
      expensesTotal: z.number(),
      productiveHours: z.number(),
      hourCost: z.number(),
      categories: z.array(categorySchema).nullable(),
    })
    .nullable(),
  previous: z
    .object({
      month: z.string(),
      productiveHours: z.number(),
      categories: z.array(categorySchema).nullable(),
    })
    .nullable(),
});

export type MonthExpenses = z.infer<typeof monthSchema>;

export const parseMonthExpenses = (data: unknown): MonthExpenses =>
  monthSchema.parse(data);

const profitRowSchema = z.object({
  productionId: z.string(),
  title: z.string(),
  clientId: z.string().nullable(),
  client: z.string().nullable(),
  month: z.string(),
  isInternal: z.boolean(),
  price: z.number().nullable(),
  estimateCost: z.number().nullable(),
  actualCost: z.number().nullable(),
  hoursComplete: z.boolean(),
  overrun: z.boolean(),
});

export type ProfitRow = z.infer<typeof profitRowSchema>;

export const parseProfitRows = (data: unknown): ProfitRow[] =>
  z.array(profitRowSchema).parse(data);

// Ό,τι στέλνει ο επεξεργαστής στην αποθήκευση· η βάση ξαναελέγχει σχήμα και ποσά.
export const saveExpensesSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Διάλεξε μήνα"),
  categories: z.array(categorySchema).max(200),
  productiveHours: z.coerce
    .number({ message: "Γράψε παραγωγικές ώρες" })
    .positive("Οι παραγωγικές ώρες είναι πάνω από 0"),
});
