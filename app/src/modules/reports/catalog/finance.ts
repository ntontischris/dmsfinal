import { RECEIVABLES_AGING } from "../reports/receivables-aging";
import { TURNOVER_BY_CLIENT } from "../reports/turnover-by-client";
import { TURNOVER_MONTHLY } from "../reports/turnover-monthly";
import type { ReportDefinition } from "./types";

// Οι οικονομικές Αναφορές (Ρα), με τη σειρά του καταλόγου.
export const FINANCE_REPORTS: readonly ReportDefinition[] = [
  TURNOVER_MONTHLY,
  TURNOVER_BY_CLIENT,
  RECEIVABLES_AGING,
];
