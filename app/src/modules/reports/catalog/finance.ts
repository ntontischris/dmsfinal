import { EXPENSES_BY_CATEGORY } from "../reports/expenses-by-category";
import { PAYMENT_METHODS } from "../reports/payment-methods";
import { PRODUCTIONS } from "../reports/productions";
import { PROFIT } from "../reports/profit";
import { RECEIVABLES_AGING } from "../reports/receivables-aging";
import { TURNOVER_BY_CLIENT } from "../reports/turnover-by-client";
import { TURNOVER_MONTHLY } from "../reports/turnover-monthly";
import type { ReportDefinition } from "./types";

// Οι οικονομικές Αναφορές (Ρα, και του παλιού DMS: d8), με τη σειρά του καταλόγου.
export const FINANCE_REPORTS: readonly ReportDefinition[] = [
  TURNOVER_MONTHLY,
  TURNOVER_BY_CLIENT,
  RECEIVABLES_AGING,
  PROFIT,
  EXPENSES_BY_CATEGORY,
  PAYMENT_METHODS,
  PRODUCTIONS,
];
