import type { ReportDefinition, ReportFilters } from "../catalog";

// Το συμβόλαιο ανάμεσα στον σκελετό της M1 (m1-screen) και στα σώματα των Αναφορών (m1-finance, m1-sales), όπως στο
// prototype (`screens/m1-model.ts`). Τα δεδομένα τα φέρνει κάθε σώμα από το δικό του RPC· η βάση κρίνει Εύρος και ποσά.
export interface ReportBodyProps {
  report: ReportDefinition;
  filters: ReportFilters;
  canExport: boolean;
}
