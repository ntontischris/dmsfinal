import { canSeeFinanceReports } from "../access";
import type { ReportDefinition } from "../catalog/types";
import { TOTAL_LABEL } from "../labels";

// Οφειλές κατά ηλικία (M1): το ανεξόφλητο (με ΦΠΑ) σήμερα, σε κουτιά από τη λήξη. Χωρίς Περίοδο. Κάθε γραμμή ανοίγει
// την Καρτέλα Πελάτη. Το «υπόλοιπο υπέρ του πελάτη» δεν μετρά. Χωρίς ποσά φαίνεται το πλήθος Τιμολογίων ανά κουτί.

const TITLE = "Οφειλές κατά ηλικία";

const BUCKETS = [
  "Δεν έχει λήξει",
  "1–30 μέρες",
  "31–60 μέρες",
  "61–90 μέρες",
  "Πάνω από 90",
] as const;

const CLIENT_COLUMN = "Πελάτης";

export const RECEIVABLES_AGING: ReportDefinition = {
  id: "receivables",
  family: "finance",
  title: TITLE,
  answers: "Ποιος χρωστά, πόσα, και πόσο καιρό είναι ληξιπρόθεσμα.",
  basis:
    "Το ανεξόφλητο υπόλοιπο κάθε Τιμολογίου (με ΦΠΑ) σήμερα, σε κουτιά από την ημερομηνία λήξης. Δεν έχει περίοδο: δείχνει πάντα τη σημερινή εικόνα.",
  usesPeriod: false,
  isVisible: canSeeFinanceReports,
  exportSpec: {
    rpc: "report_receivables_aging",
    params: [],
    rowsKey: "rows",
    columns: [
      { key: "clientName", header: CLIENT_COLUMN, type: "text" },
      ...BUCKETS.map((label, index) => ({ key: `buckets.${index}`, header: label, type: "money" as const })),
      { key: "total", header: "Σύνολο ανεξόφλητων", type: "money" },
      ...BUCKETS.map((label, index) => ({ key: `counts.${index}`, header: `Τιμολόγια: ${label}`, type: "integer" as const })),
      { key: "invoiceCount", header: "Τιμολόγια", type: "integer" },
      { key: "oldestDue", header: "Παλαιότερη λήξη", type: "date" },
    ],
    totals: { key: "totals", label: TOTAL_LABEL },
  },
};
