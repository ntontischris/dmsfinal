// Ψεύτικα δεδομένα της Ρυθμίσεων › Οικονομικά (O6). Ποσά μηνιαία, σε ευρώ.
// Οι Τρόποι είσπραξης και το κόστος του μήνα διαβάζονται από τα δεδομένα του συστήματος (finance.ts).

import { MONTH_COSTS, PAYMENT_METHODS, RECEIPTS } from "@/data/finance";
import type { SettingsListItem } from "@/screens/o-shared";

export const TARGET_MARGIN = 0.35;

export const COLLECTION_METHODS: readonly SettingsListItem[] =
  PAYMENT_METHODS.map((method) => ({
    id: method.id,
    label: method.name,
    status: method.isActive ? "Σε χρήση" : "Αποσύρθηκε",
    uses: RECEIPTS.filter((receipt) => receipt.methodId === method.id).length,
  }));

export interface ExpenseLine {
  id: string;
  label: string;
  amount: number;
}

export interface ExpenseCategory {
  id: string;
  label: string;
  lines: readonly ExpenseLine[];
}

const CURRENT_MONTH = "2026-09";
const CURRENT_COST =
  MONTH_COSTS.find((cost) => cost.month === CURRENT_MONTH) ?? MONTH_COSTS[0];

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] =
  CURRENT_COST.categories.map((category, index) => ({
    id: `e${index + 1}`,
    label: category.name,
    lines: category.items
      .flatMap((item) => item.lines)
      .map((line, lineIndex) => ({
        id: `e${index + 1}-${lineIndex + 1}`,
        label: line.label,
        amount: line.amount,
      })),
  }));

export const PRODUCTIVE_HOURS = CURRENT_COST.productiveHours;
export const PREVIOUS_HOURS = 200;
export const MONTH_LABEL = "Σεπτέμβριος 2026";

export interface RangeMultiplier {
  id: string;
  label: string;
  factor: number;
}

export const RANGE_MULTIPLIERS: readonly RangeMultiplier[] = [
  { id: "r1", label: "Χαμηλό", factor: 1.3 },
  { id: "r2", label: "Μεσαίο", factor: 1.6 },
  { id: "r3", label: "Υψηλό", factor: 2.0 },
];

export const COST_OVERRUN_LIMIT = 0.2;

export const totalExpenses = (cats: readonly ExpenseCategory[]): number =>
  cats.reduce((sum, c) => sum + c.lines.reduce((s, l) => s + l.amount, 0), 0);
