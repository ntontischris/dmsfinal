import { can } from "@/modules/access";

import type { ReportAction } from "../catalog/types";
import { ReportExportButtons } from "./components/report-export-buttons";

// Η ενέργεια «Εξαγωγή» του μητρώου (catalog/actions.ts): ισχύει για κάθε Αναφορά με exportSpec, για όποιον «Εξάγει
// δεδομένα». Τα φίλτρα είναι τα ίδια με της σελίδας· η βάση ξαναελέγχει Δικαίωμα και πηγή σε κάθε εξαγωγή.
export const REPORT_EXPORT_ACTION: ReportAction = ({
  report,
  filters,
  viewer,
}) => {
  if (!report.exportSpec || !can(viewer, "reports.export")) return null;
  return (
    <ReportExportButtons
      reportId={report.id}
      period={filters.period}
      clientId={filters.clientId}
      sellerId={filters.sellerId}
    />
  );
};
