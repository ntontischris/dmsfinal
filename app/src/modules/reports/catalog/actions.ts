import type { ReportAction } from "./types";

// Ενέργειες πάνω σε κάθε Αναφορά, κάτω από τα δεδομένα της (π.χ. «Εξαγωγή σε Excel» του Ργ). Κάθε ενέργεια αποφασίζει
// μόνη της αν ισχύει (Αναφορά, θεατής) και επιστρέφει null αλλιώς.
export const REPORT_ACTIONS: readonly ReportAction[] = [];
