import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";
import { canSeeSalesReports } from "../sales-access";

// Ανοιχτές Ευκαιρίες ανά Στάδιο (M1): τι έχουμε στα σκαριά, σήμερα. Αξία = το σύνολο της τελευταίας πρότασης, μηνιαία και
// εφάπαξ χωριστά· χωρίς πρόταση «Χωρίς πρόταση», αλλά μετρά στο πλήθος. Κάθε Ευκαιρία ανοίγει τη σελίδα της.

const TITLE = "Ανοιχτές Ευκαιρίες ανά Στάδιο";

const COLUMNS = {
  stage: "Στάδιο",
  count: "Ευκαιρίες",
  monthly: "Μηνιαία αξία",
  oneOff: "Εφάπαξ αξία",
  without: "Χωρίς πρόταση",
  opportunity: "Ευκαιρία",
  value: "Αξία",
  next: "Επόμενο βήμα",
} as const;

export const SALES_PIPELINE: ReportDefinition = {
  id: "pipeline",
  family: "sales",
  title: TITLE,
  answers: "Τι έχουμε στα σκαριά, σε ποιο Στάδιο και πόσο αξίζει.",
  basis:
    "Οι ανοιχτές Ευκαιρίες σήμερα, ανά Στάδιο. Αξία = το σύνολο της τελευταίας πρότασης (Συμφωνία της Ευκαιρίας), μηνιαία και εφάπαξ χωριστά. Όσες δεν έχουν πρόταση μετρούν στο πλήθος χωρίς αξία.",
  usesPeriod: false,
  isVisible: canSeeSalesReports,
  exportSpec: {
    rpc: "report_sales_pipeline",
    params: ["seller"],
    rowsKey: "stages",
    columns: [
      { key: "label", header: COLUMNS.stage, type: "text" },
      { key: "count", header: COLUMNS.count, type: "integer" },
      { key: "monthly", header: COLUMNS.monthly, type: "money" },
      { key: "oneOff", header: COLUMNS.oneOff, type: "money" },
      { key: "withoutProposal", header: COLUMNS.without, type: "integer" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
