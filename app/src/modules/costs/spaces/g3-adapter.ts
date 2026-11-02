// G3 (νέα εμφάνιση): οι πραγματικές γραμμές κόστους (production_costs_view, production_cost_view) και οι Ρυθμίσεις
// κόστους (cost_hint) στα σχήματα του prototype. Καθαρές συναρτήσεις.

import { hrefOf } from "@/spaces/data/screens";

import type { CostGroup, CostRow } from "../types";
import type { CostBasis, CostFigure, HoursValue } from "./g3-model";

export interface CostSettings {
  overrunPercent: number;
  multiplierMin: number;
}

export interface PickerItem {
  id: string;
  title: string;
  href: string;
  isInternal: boolean;
}

export interface PickerGroup {
  title: string;
  items: readonly PickerItem[];
}

// Οι τίτλοι των ομάδων όπως στο prototype· η ομάδα κάθε Παραγωγής την κρίνει η βάση.
export const G3_GROUPS: readonly { group: CostGroup; title: string }[] = [
  { group: "needs_hours", title: "Θέλουν Πραγματικές ώρες" },
  { group: "overrun", title: "Υπέρβαση κόστους" },
  { group: "rest", title: "Οι υπόλοιπες" },
];

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const isInternalRow = (row: CostRow): boolean => row.client === null;

export const pickerItemOf = (row: CostRow): PickerItem => ({
  id: row.productionId,
  title: row.title,
  // Η G3 είναι μία διαδρομή χωρίς {id}: η Παραγωγή μπαίνει ως ?production=.
  href: hrefOf("G3", { production: row.productionId }),
  isInternal: isInternalRow(row),
});

export const pickerGroupsOf = (
  rows: Readonly<Record<CostGroup, readonly CostRow[]>>,
): readonly PickerGroup[] =>
  G3_GROUPS.map(({ group, title }) => ({
    title,
    items: rows[group].map(pickerItemOf),
  }));

// Χωρίς ?production ανοίγει η πρώτη Παραγωγή της πρώτης μη κενής ομάδας.
export const defaultIdOf = (
  groups: readonly PickerGroup[],
): string | undefined => groups.flatMap((g) => g.items)[0]?.id;

// Η βάση δεν δίνει το Κόστος ώρας της εκτίμησης· βγαίνει από το κόστος της: (κόστος − άμεσο) ÷ ώρες.
const estimateHourCost = (
  hours: number,
  cost: number | null,
  directCost: number,
): number | null =>
  hours > 0 && cost !== null ? roundMoney((cost - directCost) / hours) : null;

// Εσωτερική χωρίς καμία γραμμένη εκτίμηση = «χωρίς εκτίμηση», όπως στο prototype (όχι μηδενική εκτίμηση).
export const estimateOf = (row: CostRow): CostFigure | null => {
  const { shootHours, editHours, directCost, cost } = row.estimate;
  if (isInternalRow(row) && shootHours + editHours === 0 && directCost === 0)
    return null;
  return {
    hours: { shoot: shootHours, edit: editHours },
    hourCost: estimateHourCost(shootHours + editHours, cost, directCost),
    directCost,
    cost,
  };
};

export const basisOf = (row: CostRow, settings: CostSettings): CostBasis => ({
  estimate: estimateOf(row),
  price: isInternalRow(row) ? null : row.estimate.price,
  hourCost: row.hourCost,
  overrunPercent: settings.overrunPercent,
  multiplierMin: settings.multiplierMin,
});

// Οι αποθηκευμένες ώρες: ό,τι γράφτηκε (null = ποτέ) και αν επιβεβαιώθηκε.
export const savedValueOf = (row: CostRow): HoursValue => ({
  shoot: row.recorded.shootHours,
  shootConfirmed: row.actual.shootConfirmed,
  edit: row.recorded.editHours,
  editConfirmed: row.actual.editConfirmed,
  directCost: row.recorded.directCost,
});

// Η εκτίμηση της Εσωτερικής όπως γράφεται στη φόρμα της (null = δεν γράφτηκε ακόμα).
export const internalEstimateOf = (
  row: CostRow,
): { shoot: number; edit: number; directCost: number } | null => {
  const estimate = estimateOf(row);
  return estimate
    ? { ...estimate.hours, directCost: estimate.directCost }
    : null;
};
