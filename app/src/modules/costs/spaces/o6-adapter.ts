// O6 (νέα εμφάνιση): οι πραγματικές Ρυθμίσεις Οικονομικών (cost_hint, Τρόποι είσπραξης, Ίχνος) στα σχήματα του
// prototype (`screens/O6.tsx`, `o-shared.tsx`). Καθαρές συναρτήσεις.

import {
  formatDateTime,
  formatMonth,
  type CostHint,
} from "@/modules/catalogue";
import type { PaymentMethod } from "@/modules/finance";

// Οι πίνακες του Ίχνους που αφορούν την καρτέλα, και τα πεδία τους σε ελληνικά (ίδια με τη σημερινή σελίδα).
export const O6_AUDIT_ENTITIES = ["cost_months", "cost_settings"] as const;

const FIELD_LABELS: Readonly<Record<string, string>> = {
  month: "Μήνας",
  expenses_total: "Έξοδα",
  productive_hours: "Παραγωγικές ώρες",
  hour_cost: "Κόστος ώρας",
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
