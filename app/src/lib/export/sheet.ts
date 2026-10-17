// Το κοινό σχήμα ενός φύλλου εξαγωγής (Ρ6): στήλες με ελληνικό τίτλο και τύπο, γραμμές με κελιά. Από αυτό γράφονται
// το .xlsx και το .csv των Αναφορών και τα CSV της εξαγωγής GDPR.

// text: κείμενο · integer: πλήθος · number: αριθμός (π.χ. ώρες) · money: ποσό σε ευρώ · percent: κλάσμα (0,25 = 25%)
// date: 'YYYY-MM-DD' · month: 'YYYY-MM'
export type CellType =
  "text" | "integer" | "number" | "money" | "percent" | "date" | "month";

export type Cell = string | number | null;

export interface SheetColumn {
  header: string;
  type: CellType;
}

export interface ExportSheet {
  name: string;
  columns: readonly SheetColumn[];
  rows: readonly (readonly Cell[])[];
}
