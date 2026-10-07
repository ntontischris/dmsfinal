// Ψεύτικα δεδομένα της Ρυθμίσεων › Οικονομικά (O6). Ποσά μηνιαία, σε ευρώ.

import type { SettingsListItem } from "@/screens/o-shared";

export const TARGET_MARGIN = 0.35;

export const COLLECTION_METHODS: readonly SettingsListItem[] = [
  { id: "c1", label: "Τραπεζική μεταφορά", status: "Σε χρήση", uses: 41 },
  { id: "c2", label: "Μετρητά", status: "Σε χρήση", uses: 6 },
  { id: "c3", label: "Κάρτα (POS)", status: "Σε χρήση", uses: 9 },
  { id: "c4", label: "IRIS", status: "Νέα", uses: 0 },
  { id: "c5", label: "Επιταγή", status: "Αποσύρθηκε", uses: 3 },
];

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

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  {
    id: "e1",
    label: "Μισθοδοσία",
    lines: [
      { id: "e1a", label: "Μισθός 1", amount: 2800 },
      { id: "e1b", label: "Μισθός 2", amount: 2100 },
      { id: "e1c", label: "Μισθός 3", amount: 1500 },
    ],
  },
  { id: "e2", label: "Ενοίκιο", lines: [{ id: "e2a", label: "Ενοίκιο στούντιο", amount: 900 }] },
  { id: "e3", label: "Συνδρομές λογισμικού", lines: [{ id: "e3a", label: "Συνδρομές λογισμικού", amount: 420 }] },
  { id: "e4", label: "Εξοπλισμός αποσβέσεις", lines: [{ id: "e4a", label: "Αποσβέσεις εξοπλισμού", amount: 780 }] },
];

export const PRODUCTIVE_HOURS = 320;
export const PREVIOUS_HOURS = 352;
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
