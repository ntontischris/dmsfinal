import { canSeeProductionReports } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Παραγωγές ανά κατάσταση και είδος (d8, από το παλιό DMS): όσες ξεκίνησαν στην περίοδο, ανά είδος Συμφωνίας.

export const PRODUCTION_TYPE_LABELS: Readonly<Record<string, string>> = {
  monthly: "Μηνιαίες",
  one_off: "Εφάπαξ",
  internal: "Εσωτερικές",
};

export const PRODUCTIONS: ReportDefinition = {
  id: "productions",
  family: "finance",
  title: "Παραγωγές ανά κατάσταση",
  answers: "Πόσες Παραγωγές ξεκίνησαν, παραδόθηκαν ή ακυρώθηκαν.",
  basis:
    "Όσες ξεκίνησαν στην περίοδο, με την κατάστασή τους σήμερα, ανά είδος Συμφωνίας. Με Εύρος «δικές μου» μόνο όσες σε αφορούν.",
  usesPeriod: true,
  isVisible: canSeeProductionReports,
  exportSpec: {
    rpc: "report_productions",
    params: ["period"],
    rowsKey: "rows",
    columns: [
      {
        key: "type",
        header: "Είδος",
        type: "text",
        labels: PRODUCTION_TYPE_LABELS,
      },
      { key: "open", header: "Ανοιχτές", type: "integer" },
      { key: "delivered", header: "Παραδόθηκαν", type: "integer" },
      { key: "cancelled", header: "Ακυρώθηκαν", type: "integer" },
      { key: "total", header: "Σύνολο", type: "integer" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
