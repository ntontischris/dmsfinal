import { SALES_PIPELINE } from "../reports/sales-pipeline";
import { SALES_RESULTS } from "../reports/sales-results";
import { SALES_SOURCES } from "../reports/sales-sources";
import type { ReportDefinition } from "./types";

// Οι Αναφορές πωλήσεων (Ρβ), με τη σειρά του καταλόγου.
export const SALES_REPORTS: readonly ReportDefinition[] = [
  SALES_PIPELINE,
  SALES_RESULTS,
  SALES_SOURCES,
];
