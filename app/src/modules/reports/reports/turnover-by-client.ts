import { canSeeFinanceReports } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Τζίρος ανά Πελάτη (M1): όπως ο Τζίρος, με μερίδιο στο σύνολο της περιόδου. Κάθε γραμμή ανοίγει τη Σελίδα Πελάτη.

const TITLE = "Τζίρος ανά Πελάτη";

const COLUMNS = {
  client: "Πελάτης",
  turnover: "Τζίρος",
  share: "Μερίδιο",
  invoices: "Τιμολόγια",
} as const;

export const TURNOVER_BY_CLIENT: ReportDefinition = {
  id: "by-client",
  family: "finance",
  title: TITLE,
  answers: "Από ποιους Πελάτες έρχεται ο Τζίρος της περιόδου.",
  basis:
    "Καθαρά ποσά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης, με μερίδιο στο σύνολο.",
  usesPeriod: true,
  isVisible: canSeeFinanceReports,
  exportSpec: {
    rpc: "report_turnover_by_client",
    params: ["period"],
    rowsKey: "rows",
    columns: [
      { key: "clientName", header: COLUMNS.client, type: "text" },
      { key: "turnover", header: COLUMNS.turnover, type: "money" },
      { key: "share", header: COLUMNS.share, type: "percent" },
      { key: "invoiceCount", header: COLUMNS.invoices, type: "integer" },
      { key: "creditCount", header: "Πιστωτικά", type: "integer" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
