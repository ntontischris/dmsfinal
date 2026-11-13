import type {
  BillableReason,
  PeriodState,
  ProductionState,
  ProductionTab,
  TaskPriority,
  TaskStatus,
} from "./types";

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

// Κατάσταση και προτεραιότητα Εργασίας.
export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  todo: "να γίνει",
  doing: "σε εξέλιξη",
  done: "έγινε",
};

export const TASK_PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  low: "χαμηλή",
  normal: "κανονική",
  high: "υψηλή",
};

// Ο λόγος ενός Τιμολογητέου (ίδια κείμενα με το «Προς τιμολόγηση»).
export const BILLABLE_REASON_LABELS: Readonly<Record<BillableReason, string>> = {
  period: "Περίοδος",
  milestone: "Δόση",
  extra_deliverable: "Έξτρα Παραδοτέο",
  extra_revision: "Έξτρα αναθεώρηση",
  extra_filming: "Έξτρα Γύρισμα",
  dissolution_fee: "Ρήτρα λύσης",
};
