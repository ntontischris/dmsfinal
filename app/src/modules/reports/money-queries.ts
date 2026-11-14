import { createSupabase } from "@/lib/supabase/server";

import {
  parseExpensesByCategory,
  parsePaymentMethods,
  parseProductions,
  parseProfit,
  type ExpensesByCategory,
  type PaymentMethodsReport,
  type ProductionsReport,
  type ProfitReport,
} from "./money-schema";
import { read, type ReadResult } from "./read";
import type { PeriodCode } from "./url";

// Ανάγνωση των Αναφορών του παλιού DMS (d8). Όλα περνούν από RPC με μόνη παράμετρο την Περίοδο· η βάση κρίνει
// Δικαίωμα, Εύρος και αν φαίνονται τα ποσά.

async function readByPeriod<T>(
  rpc: string,
  period: PeriodCode,
  parse: (data: unknown) => T,
): Promise<ReadResult<T>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(rpc, supabase.rpc(rpc, { p_period: period }), parse);
}

export const getExpensesByCategory = (
  period: PeriodCode,
): Promise<ReadResult<ExpensesByCategory>> =>
  readByPeriod("report_expenses_by_category", period, parseExpensesByCategory);

export const getProfit = (
  period: PeriodCode,
): Promise<ReadResult<ProfitReport>> =>
  readByPeriod("report_profit", period, parseProfit);

export const getPaymentMethods = (
  period: PeriodCode,
): Promise<ReadResult<PaymentMethodsReport>> =>
  readByPeriod("report_payment_methods", period, parsePaymentMethods);

export const getProductionsReport = (
  period: PeriodCode,
): Promise<ReadResult<ProductionsReport>> =>
  readByPeriod("report_productions", period, parseProductions);
