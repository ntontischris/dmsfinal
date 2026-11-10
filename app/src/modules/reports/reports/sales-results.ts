import type { ReportDefinition } from "../catalog/types";
import { canSeeSalesReports } from "../sales-access";

// Κερδισμένες και χαμένες (M1): πόσες κλείσαμε, πόσες χάσαμε και γιατί, κατά ημερομηνία Έκβασης (ώρα Ελλάδας).
// Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες), από τη βάση. Κάθε Ευκαιρία ανοίγει τη σελίδα της.

const TITLE = "Κερδισμένες και χαμένες";

const COLUMNS = {
  opportunity: "Ευκαιρία",
  outcome: "Έκβαση",
  closedOn: "Ημερομηνία Έκβασης",
  value: "Αξία",
  reason: "Λόγος απώλειας",
  count: "Ευκαιρίες",
} as const;

const OUTCOME = { won: "Κερδισμένη", lost: "Χαμένη" } as const;

export const SALES_RESULTS: ReportDefinition = {
  id: "results",
  family: "sales",
  title: TITLE,
  answers: "Πόσες Ευκαιρίες κλείσαμε, πόσες χάσαμε και γιατί.",
  basis:
    "Οι Ευκαιρίες που πήραν Έκβαση μέσα στην περίοδο, κατά ημερομηνία Έκβασης σε ώρα Ελλάδας. Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες). Οι λόγοι απώλειας μετρούν πόσες χάθηκαν για τον καθένα.",
  usesPeriod: true,
  isVisible: canSeeSalesReports,
  exportSpec: {
    rpc: "report_sales_results",
    params: ["period", "seller"],
    rowsKey: "rows",
    columns: [
      { key: "title", header: COLUMNS.opportunity, type: "text" },
      { key: "clientName", header: "Πελάτης", type: "text" },
      { key: "managerName", header: "Υπεύθυνος", type: "text" },
      { key: "outcome", header: COLUMNS.outcome, type: "text", labels: OUTCOME },
      { key: "closedOn", header: COLUMNS.closedOn, type: "date" },
      { key: "lossReason", header: COLUMNS.reason, type: "text" },
      { key: "kind", header: "Είδος", type: "text", labels: { monthly: "Μηνιαία", one_off: "Εφάπαξ" } },
      { key: "value", header: COLUMNS.value, type: "money" },
    ],
  },
};
