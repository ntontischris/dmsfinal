import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";
import { canSeeSalesReports } from "../sales-access";

// Πηγές Ευκαιριών (M1): οι Ευκαιρίες που άνοιξαν μέσα στην περίοδο, ανά Πηγή, και τι έγιναν ως σήμερα. Μόνο πλήθη.
// Κάθε Ευκαιρία της περιόδου ανοίγει τη σελίδα της.

const TITLE = "Πηγές Ευκαιριών";

const COLUMNS = {
  source: "Πηγή",
  opened: "Άνοιξαν",
  won: "Κερδήθηκαν",
  lost: "Χάθηκαν",
  open: "Ακόμα ανοιχτές",
  rate: "Ποσοστό επιτυχίας",
  opportunity: "Ευκαιρία",
  outcome: "Σήμερα",
  createdOn: "Άνοιξε",
} as const;

export const SALES_SOURCES: ReportDefinition = {
  id: "sources",
  family: "sales",
  title: TITLE,
  answers: "Ποιες Πηγές φέρνουν δουλειά.",
  basis:
    "Οι Ευκαιρίες που άνοιξαν μέσα στην περίοδο (ώρα Ελλάδας), ανά Πηγή, και τι έγιναν ως σήμερα: ανοιχτές, κερδισμένες, χαμένες. Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες).",
  usesPeriod: true,
  isVisible: canSeeSalesReports,
  exportSpec: {
    rpc: "report_sales_sources",
    params: ["period", "seller"],
    rowsKey: "rows",
    columns: [
      { key: "label", header: COLUMNS.source, type: "text" },
      { key: "opened", header: COLUMNS.opened, type: "integer" },
      { key: "won", header: COLUMNS.won, type: "integer" },
      { key: "lost", header: COLUMNS.lost, type: "integer" },
      { key: "open", header: COLUMNS.open, type: "integer" },
      { key: "winRate", header: COLUMNS.rate, type: "percent" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
