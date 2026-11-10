import { canSeeFinanceReports } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Τζίρος και Εισπράξεις ανά μήνα (M1). Τζίρος χωρίς ΦΠΑ κατά έκδοση, Εισπράξεις με ΦΠΑ κατά είσπραξη: δίπλα δίπλα,
// ποτέ προστιθέμενα. Φίλτρα: Περίοδος, Πελάτης.

const TITLE = "Τζίρος και Εισπράξεις ανά μήνα";

const COLUMNS = {
  month: "Μήνας",
  turnover: "Τζίρος",
  invoices: "Τιμολόγια",
  collections: "Εισπράξεις",
  receipts: "Εισπράξεις (πλήθος)",
} as const;

export const TURNOVER_MONTHLY: ReportDefinition = {
  id: "turnover",
  family: "finance",
  title: TITLE,
  answers: "Πόσα τιμολογήσαμε και πόσα μπήκαν, κάθε μήνα.",
  basis:
    "Τζίρος: καθαρά ποσά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης. Εισπράξεις: ποσά με ΦΠΑ, κατά ημερομηνία είσπραξης. Δεν προστίθενται ούτε αφαιρούνται μεταξύ τους.",
  usesPeriod: true,
  isVisible: canSeeFinanceReports,
  exportSpec: {
    rpc: "report_turnover_monthly",
    params: ["period", "client"],
    rowsKey: "months",
    columns: [
      { key: "month", header: COLUMNS.month, type: "month" },
      { key: "turnover", header: COLUMNS.turnover, type: "money" },
      { key: "invoiceCount", header: COLUMNS.invoices, type: "integer" },
      { key: "creditCount", header: "Πιστωτικά", type: "integer" },
      { key: "collections", header: COLUMNS.collections, type: "money" },
      { key: "receiptCount", header: COLUMNS.receipts, type: "integer" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
