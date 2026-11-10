import type { Viewer } from "@/modules/access";

import { FINANCE_REPORTS } from "./finance";
import { SALES_REPORTS } from "./sales";
import type { ReportDefinition } from "./types";

// Το μητρώο Αναφορών. Νέα Αναφορά: ένα αρχείο στο reports/ και μία γραμμή στη λίστα της οικογένειάς της
// (finance.ts ή sales.ts). Εδώ δεν αλλάζει τίποτα.

export const REPORTS: readonly ReportDefinition[] = [...FINANCE_REPORTS, ...SALES_REPORTS];

export const findReport = (id: string | undefined): ReportDefinition | undefined =>
  REPORTS.find((report) => report.id === id);

export const visibleReports = (viewer: Viewer): readonly ReportDefinition[] =>
  REPORTS.filter((report) => report.isVisible(viewer));

export type { ReportDefinition, ReportFamily, ReportFilters } from "./types";
