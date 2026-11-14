import { canSeeFinanceReports } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Τρόποι είσπραξης (d8, από το παλιό DMS): οι Εισπράξεις της περιόδου ανά Τρόπο, με την παρακράτηση χωριστά.

export const PAYMENT_METHODS: ReportDefinition = {
  id: "payment-methods",
  family: "finance",
  title: "Τρόποι είσπραξης",
  answers: "Πώς πληρώνουν οι Πελάτες.",
  basis:
    "Οι Εισπράξεις της περιόδου (με ΦΠΑ, κατά ημερομηνία είσπραξης) ανά Τρόπο. Η παρακράτηση φαίνεται χωριστά.",
  usesPeriod: true,
  isVisible: canSeeFinanceReports,
  exportSpec: {
    rpc: "report_payment_methods",
    params: ["period"],
    rowsKey: "rows",
    columns: [
      { key: "label", header: "Τρόπος", type: "text" },
      { key: "amount", header: "Εισπράξεις", type: "money" },
      { key: "share", header: "Μερίδιο", type: "percent" },
      { key: "receiptCount", header: "Πλήθος", type: "integer" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
