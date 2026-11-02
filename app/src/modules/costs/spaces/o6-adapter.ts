// O6 (νέα εμφάνιση): οι πραγματικές Ρυθμίσεις Οικονομικών (cost_hint, Τρόποι είσπραξης, Ίχνος) στα σχήματα του
// prototype (`screens/O6.tsx`, `o-shared.tsx`). Καθαρές συναρτήσεις.

import {
  MONTH_STATUS_LABELS,
  formatDateTime,
  formatMonth,
  minimumMargin,
  monthStatus,
  type CostHint,
  type CostMonth,
  type MonthStatus,
  type Multipliers,
} from "@/modules/catalogue";
import type { PaymentMethod } from "@/modules/finance";

// Οι πίνακες του Ίχνους που αφορούν την καρτέλα, και τα πεδία τους σε ελληνικά (ίδια με τη σημερινή σελίδα).
export const O6_AUDIT_ENTITIES = ["cost_months", "cost_settings"] as const;

const FIELD_LABELS: Readonly<Record<string, string>> = {
  month: "Μήνας",
  expenses_total: "Έξοδα",
  productive_hours: "Παραγωγικές ώρες",
  hour_cost: "Κόστος ώρας",
  expense_categories: "Ανάλυση εξόδων",
  multiplier_min: "Ελάχιστη (×)",
  multiplier_target: "Στόχος (×)",
  multiplier_max: "Μέγιστη (×)",
  overrun_percent: "Ποσοστό υπέρβασης",
};

export interface SettingsChangeInput {
  at: string;
  entity: string;
  actorName: string;
  fields: readonly string[];
}

export interface ChangeRow {
  key: string;
  when: string;
  title: string;
  sub: string;
}

export const changeRowsOf = (
  changes: readonly SettingsChangeInput[],
): readonly ChangeRow[] =>
  changes.map((change) => ({
    key: `${change.at}-${change.entity}`,
    when: formatDateTime(change.at),
    title: change.actorName,
    sub:
      change.fields.map((field) => FIELD_LABELS[field] ?? field).join(", ") ||
      "άλλαξε",
  }));

export type MethodStatus = "Σε χρήση" | "Αποσύρθηκε";

export interface MethodItem {
  id: string;
  label: string;
  status: MethodStatus;
}

// Η βάση ξέρει μόνο «ενεργός / αποσυρμένος»· χρήσεις και «Νέα» δεν υπάρχουν, οπότε δεν φαίνονται.
export const methodItemsOf = (
  methods: readonly PaymentMethod[],
): readonly MethodItem[] =>
  methods.map((method) => ({
    id: method.id,
    label: method.label,
    status: method.retired ? "Αποσύρθηκε" : "Σε χρήση",
  }));

export interface HourCostGlance {
  monthLabel: string | null; // null = δεν έχει οριστεί ακόμα Κόστος ώρας
  hourCost: number | null;
}

export const hourCostOf = (hint: CostHint): HourCostGlance =>
  hint.hourCost === null || hint.hourCostMonth === null
    ? { monthLabel: null, hourCost: null }
    : { monthLabel: formatMonth(hint.hourCostMonth), hourCost: hint.hourCost };

export interface MonthRow {
  month: string;
  label: string;
  expenses: number;
  sub: string;
  status: MonthStatus;
  statusLabel: string;
}

// Οι μήνες Κόστους ώρας ως γραμμές λίστας: έξοδα δεξιά, ώρες, Κόστος ώρας και ποιος τα έγραψε από κάτω.
export const monthRowsOf = (
  months: readonly CostMonth[],
  current: string,
  fmt: { money: (value: number) => string; hours: (value: number) => string },
): readonly MonthRow[] =>
  months.map((row) => {
    const status = monthStatus(row.month, current);
    return {
      month: row.month,
      label: formatMonth(row.month),
      expenses: row.expensesTotal,
      sub: [
        `${fmt.hours(row.productiveHours)} ώρες`,
        `Κόστος ώρας ${fmt.money(row.hourCost)}`,
        row.updatedByName && `${row.updatedByName}, ${formatDateTime(row.updatedAt)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      status,
      statusLabel: MONTH_STATUS_LABELS[status],
    };
  });

export interface MultiplierRow {
  name: keyof Multipliers;
  label: string;
  factor: number;
  margin: number;
}

const MULTIPLIER_LABELS: Readonly<Record<keyof Multipliers, string>> = {
  min: "Ελάχιστη",
  target: "Στόχος",
  max: "Μέγιστη",
};

// Οι τρεις πολλαπλασιαστές με το περιθώριο που δίνει ο καθένας (1 − 1/π).
export const multiplierRowsOf = (
  multipliers: Multipliers,
): readonly MultiplierRow[] =>
  (["min", "target", "max"] as const).map((name) => ({
    name,
    label: MULTIPLIER_LABELS[name],
    factor: multipliers[name],
    margin: minimumMargin(multipliers[name]),
  }));
