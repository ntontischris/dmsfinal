import type {
  CrewResponse,
  DoneMarkingMode,
  EquipmentConflictMode,
  FilmingState,
  FilmingTab,
  NoAnswerAction,
  ProvisionMeasure,
  SheetSendingMode,
} from "./types";

// Κείμενα του module «Γυρίσματα»: οι κωδικοί της βάσης σε ελληνικά.

export const STATE_LABELS: Readonly<Record<FilmingState, string>> = {
  pending: "Αναμένει έγκριση",
  scheduled: "Προγραμματισμένο",
  done: "Έγινε",
  no_show: "Δεν έγινε",
  cancelled: "Ακυρώθηκε",
  rejected: "Απορρίφθηκε",
};

export const TAB_LABELS: Readonly<Record<FilmingTab, string>> = {
  open: "Ανοιχτά",
  pending: "Αναμένουν έγκριση",
  needs_outcome: "Θέλουν «έγινε»",
  closed: "Κλεισμένα",
  all: "Όλα",
};

export const TAB_EMPTY_TEXT: Readonly<Record<FilmingTab, string>> = {
  open: "Κανένα ανοιχτό Γύρισμα.",
  pending: "Κανένα Γύρισμα δεν περιμένει έγκριση.",
  needs_outcome: "Κανένα Γύρισμα δεν θέλει σήμανση «έγινε».",
  closed: "Κανένα κλεισμένο Γύρισμα.",
  all: "Κανένα Γύρισμα ακόμα.",
};

export const RESPONSE_LABELS: Readonly<Record<CrewResponse, string>> = {
  pending: "Περιμένει",
  confirmed: "Επιβεβαίωσε",
  declined: "Δεν μπορεί",
};

export const MEASURE_LABELS: Readonly<Record<ProvisionMeasure, string>> = {
  per_filming: "ανά Γύρισμα",
  per_hour: "ανά ώρα",
  per_day: "ανά μέρα",
};

export const NO_ANSWER_LABELS: Readonly<Record<NoAnswerAction, string>> = {
  none: "Τίποτα (μόνο σήμα)",
  approve: "Αυτόματη έγκριση",
  reject: "Αυτόματη απόρριψη",
};

export const CONFLICT_LABELS: Readonly<Record<EquipmentConflictMode, string>> =
  {
    warn: "Προειδοποίηση",
    block: "Μπλοκάρει",
  };

export const SHEET_LABELS: Readonly<Record<SheetSendingMode, string>> = {
  manual: "Χειροκίνητη αποστολή",
  auto: "Αυτόματη αποστολή",
};

export const DONE_LABELS: Readonly<Record<DoneMarkingMode, string>> = {
  manual: "Χειροκίνητα",
  auto: "Αυτόματα μετά τη μέρα",
};

export const SIGNAL_LABELS = {
  equipmentConflict: "Σύγκρουση εξοπλισμού",
  isExtra: "Έξτρα",
  cancelRequest: "Αίτημα ακύρωσης",
  crewDeclined: "«Δεν μπορώ»",
} as const;

// Τα γεγονότα του Ίχνους (action «event») όπως φαίνονται στο Ιστορικό.
export const EVENT_LABELS: Readonly<Record<string, string>> = {
  created: "Κλείστηκε από την ομάδα",
  booked: "Κλείστηκε από τον Πελάτη",
  approved: "Εγκρίθηκε",
  rejected: "Απορρίφθηκε",
  cancelled: "Ακυρώθηκε",
  cancel_requested: "Ζητήθηκε ακύρωση",
  cancel_request_decided: "Αίτημα ακύρωσης κρίθηκε",
  rescheduled: "Μετατέθηκε",
  done: "Σημειώθηκε «έγινε»",
  no_show: "Σημειώθηκε «δεν έγινε»",
  outcome_undone: "Αναιρέθηκε το αποτέλεσμα",
  crew_changed: "Άλλαξε το Συνεργείο",
  crew_declined: "Μέλος δήλωσε «δεν μπορώ»",
  equipment_changed: "Άλλαξε ο Εξοπλισμός",
  equipment_conflict: "Σύγκρουση εξοπλισμού",
};

export const UNKNOWN_ACTOR_LABEL = "Άγνωστος χρήστης";
export const NO_CLIENT_LABEL = "Εσωτερική";
export const NO_CREW_LABEL = "Χωρίς Συνεργείο";
