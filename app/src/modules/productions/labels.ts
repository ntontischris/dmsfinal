import type { PeriodState, ProductionState, ProductionTab } from "./types";

// Κείμενα του module: οι κωδικοί της βάσης σε ελληνικά.

export const STATE_LABELS: Readonly<Record<ProductionState, string>> = {
  open: "Ανοιχτή",
  delivered: "Παραδομένη",
  cancelled: "Ακυρωμένη",
};

export const TAB_LABELS: Readonly<Record<ProductionTab, string>> = {
  open: "Ανοιχτές",
  delivered: "Παραδομένες",
  all: "Όλες",
};

export const PERIOD_STATE_LABELS: Readonly<Record<PeriodState, string>> = {
  closed: "κλειστή",
  current: "τρέχουσα",
  next: "επόμενη",
};

// Τα γεγονότα του Ίχνους (action «event») όπως φαίνονται στο Ιστορικό.
export const EVENT_LABELS: Readonly<Record<string, string>> = {
  created: "Δημιουργήθηκε η Παραγωγή",
  delivered: "Παραδόθηκε",
  reopened: "Ξανανοίχτηκε",
  cancelled: "Ακυρώθηκε",
  owner_transferred: "Μεταβιβάστηκε σε νέο Υπεύθυνο",
  member_added: "Προστέθηκε Μέλος",
  member_removed: "Αφαιρέθηκε Μέλος",
};

export const MONTH_NAMES: readonly string[] = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

export const UNKNOWN_ACTOR_LABEL = "—";
export const NO_OWNER_LABEL = "Χωρίς υπεύθυνο";
export const INTERNAL_LABEL = "Εσωτερική";
export const NO_PERIOD_LABEL = "—";
