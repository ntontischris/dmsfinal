import { canSeeExpenseReports } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Έξοδα ανά κατηγορία (d8, από το παλιό DMS): οι κατηγορίες της ανάλυσης Εξόδων (I6) στην περίοδο. Μήνας χωρίς
// ανάλυση μετρά στο «Χωρίς ανάλυση».

export const EXPENSES_BY_CATEGORY: ReportDefinition = {
  id: "expenses",
  family: "finance",
  title: "Έξοδα ανά κατηγορία",
  answers: "Πού πάνε τα Έξοδα της περιόδου.",
  basis:
    "Τα Έξοδα κάθε μήνα όπως γράφτηκαν στο Κόστος, ανά κατηγορία της ανάλυσης.",
  usesPeriod: true,
  isVisible: canSeeExpenseReports,
  exportSpec: {
    rpc: "report_expenses_by_category",
    params: ["period"],
    rowsKey: "rows",
    columns: [
      { key: "category", header: "Κατηγορία", type: "text" },
      { key: "amount", header: "Έξοδα", type: "money" },
      { key: "share", header: "Μερίδιο", type: "percent" },
      { key: "lineCount", header: "Γραμμές", type: "integer" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
