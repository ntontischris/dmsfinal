import { REPORT_EXPORT_ACTION } from "../export/report-export-action";
import type { ReportAction } from "./types";

// Ενέργειες πάνω σε κάθε Αναφορά, κάτω από τα δεδομένα της. Κάθε ενέργεια αποφασίζει μόνη της αν ισχύει (Αναφορά,
// θεατής) και επιστρέφει null αλλιώς. «Εξαγωγή» (Ργ): κάθε Αναφορά με exportSpec, για όποιον «Εξάγει δεδομένα».
export const REPORT_ACTIONS: readonly ReportAction[] = [REPORT_EXPORT_ACTION];
