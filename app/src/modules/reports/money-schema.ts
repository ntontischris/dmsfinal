import { z } from "zod";

import { periodSchema } from "./view-schema";

// Σχήματα των RPC των Αναφορών του παλιού DMS (d8): report_expenses_by_category, report_profit, report_payment_methods,
// report_productions. Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά. Τα ποσά είναι null όταν ο Χρήστης δεν τα βλέπει.

const amount = z.number().nullable();

const expenseRowSchema = z.object({
  category: z.string(),
  amount: z.number(),
  share: amount,
  lineCount: z.number(),
});

const expensesSchema = z.object({
  period: periodSchema,
  rows: z.array(expenseRowSchema),
  totals: z.object({ amount: z.number(), lineCount: z.number() }),
  monthCount: z.number(),
  unsplitMonths: z.number(),
  missingMonths: z.number(),
});

const profitMonthSchema = z.object({
  month: z.string(),
  income: amount,
  expenses: amount,
  profit: amount,
  margin: amount,
  isPartial: z.boolean(),
});

const profitSchema = z.object({
  period: periodSchema,
  amounts: z.boolean(),
  months: z.array(profitMonthSchema),
  totals: profitMonthSchema.omit({ month: true, isPartial: true }),
  missingMonths: z.number(),
});

const methodRowSchema = z.object({
  methodId: z.string(),
  label: z.string(),
  retired: z.boolean(),
  amount,
  share: amount,
  receiptCount: z.number(),
});

const methodsSchema = z.object({
  period: periodSchema,
  amounts: z.boolean(),
  rows: z.array(methodRowSchema),
  totals: z.object({
    amount,
    receiptCount: z.number(),
    withheld: amount,
    withheldCount: z.number(),
  }),
});

const stateCounts = {
  open: z.number(),
  delivered: z.number(),
  cancelled: z.number(),
  total: z.number(),
};

const productionsSchema = z.object({
  period: periodSchema,
  rows: z.array(z.object({ type: z.string(), ...stateCounts })),
  totals: z.object(stateCounts),
  deliveredInPeriod: z.number(),
});

export type ExpensesByCategory = z.infer<typeof expensesSchema>;
export type ProfitMonth = z.infer<typeof profitMonthSchema>;
export type ProfitReport = z.infer<typeof profitSchema>;
export type PaymentMethodsReport = z.infer<typeof methodsSchema>;
export type ProductionsReport = z.infer<typeof productionsSchema>;

export const parseExpensesByCategory = (data: unknown): ExpensesByCategory =>
  expensesSchema.parse(data);
export const parseProfit = (data: unknown): ProfitReport =>
  profitSchema.parse(data);
export const parsePaymentMethods = (data: unknown): PaymentMethodsReport =>
  methodsSchema.parse(data);
export const parseProductions = (data: unknown): ProductionsReport =>
  productionsSchema.parse(data);
