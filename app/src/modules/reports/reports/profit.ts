import { canSeeProfitReport } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Έσοδα − Έξοδα = Κέρδος, ανά μήνα (d8, από το παλιό DMS). Έσοδα = ο Τζίρος (καθαρά, μετά τα Πιστωτικά), Έξοδα = ό,τι
// γράφτηκε στο Κόστος. Μήνας χωρίς Έξοδα δεν έχει Κέρδος και δεν μετρά στα σύνολα.

export const PROFIT: ReportDefinition = {
  id: "profit",
  family: "finance",
  title: "Έσοδα, Έξοδα και Κέρδος",
  answers: "Πόσα μένουν κάθε μήνα, μετά τα Έξοδα.",
  basis:
    "Έσοδα = Τζίρος χωρίς ΦΠΑ μετά τα Πιστωτικά· Έξοδα = το σύνολο του μήνα στο Κόστος. Τα σύνολα μόνο από μήνες με Έξοδα.",
  usesPeriod: true,
  isVisible: canSeeProfitReport,
  exportSpec: {
    rpc: "report_profit",
    params: ["period"],
    rowsKey: "months",
    columns: [
      { key: "month", header: "Μήνας", type: "month" },
      { key: "income", header: "Έσοδα", type: "money" },
      { key: "expenses", header: "Έξοδα", type: "money" },
      { key: "profit", header: "Κέρδος", type: "money" },
      { key: "margin", header: "Περιθώριο", type: "percent" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
