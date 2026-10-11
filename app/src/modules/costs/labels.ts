import type { CostGroup, CostState } from "./types";

// Κείμενα του module: ομάδες, σήματα και καταστάσεις σε ελληνικά.

export const GROUP_LABELS: Readonly<Record<CostGroup, string>> = {
  needs_hours: "Θέλουν πραγματικές ώρες",
  overrun: "Υπέρβαση",
  rest: "Οι υπόλοιπες",
};

export const STATE_LABELS: Readonly<Record<CostState, string>> = {
  open: "Ανοιχτή",
  delivered: "Παραδομένη",
  cancelled: "Ακυρωμένη",
};

export const SIGNAL_LABELS = {
  lowMargin: "Χαμηλό περιθώριο",
  overrun: "Υπέρβαση",
} as const;

export const INTERNAL_LABEL = "Εσωτερική";
export const NO_VALUE_LABEL = "—";
export const COST_TITLE = "Κόστος και ώρες";
