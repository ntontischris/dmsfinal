// Τύποι του module «Κόστος και ώρες» (G3, και η καρτέλα «Θέλουν ώρες» της G1). Τα JSON της βάσης έρχονται σε camelCase.
// Το null σημαίνει «δεν δικαιούσαι» ή «δεν ορίζεται» (π.χ. τιμή της Εσωτερικής), ποτέ μηδέν.

export const COST_GROUPS = ["needs_hours", "overrun", "rest"] as const;
export type CostGroup = (typeof COST_GROUPS)[number];

export const COST_STATES = ["open", "delivered", "cancelled"] as const;
export type CostState = (typeof COST_STATES)[number];

export interface CostEstimate {
  shootHours: number;
  editHours: number;
  directCost: number;
  price: number | null; // null = Εσωτερική Παραγωγή
  cost: number;
}

export interface CostActual {
  shootHours: number;
  shootConfirmed: boolean;
  editHours: number;
  editConfirmed: boolean;
  directCost: number;
  cost: number;
  suggestedShootHours: number;
}

// Τα ώρες και το άμεσο κόστος όπως γράφτηκαν (πρόχειρα ή επιβεβαιωμένα). Null = δεν έχουν γραφτεί ποτέ.
export interface CostRecorded {
  shootHours: number | null;
  editHours: number | null;
  directCost: number | null;
}

export interface CostSignals {
  lowMargin: boolean;
  overrun: boolean;
}

export interface CostRow {
  productionId: string;
  title: string;
  client: string | null; // null = Εσωτερική
  state: CostState;
  estimate: CostEstimate;
  actual: CostActual;
  recorded: CostRecorded;
  hourCost: number | null;
  hoursComplete: boolean;
  signals: CostSignals;
}

export interface CostDetail extends CostRow {
  canEdit: boolean;
}

export interface CostsCaps {
  canView: boolean;
}
