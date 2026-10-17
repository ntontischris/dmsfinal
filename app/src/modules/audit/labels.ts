import type { AuditAction, AuditPeriod, FilterKey } from "./url";

// Ελληνικά κείμενα του Ίχνους ενεργειών (P1), όπως στο prototype. Οι ετικέτες περιοχών και στοιχείων έρχονται από τη βάση.

export const AUDIT_TITLE = "Ίχνος ενεργειών";
export const AUDIT_EYEBROW = "P1 · Διατομεακά";
export const HISTORY_LINK = "Ιστορικό αλλαγών";

export const AUDIT_NOTE =
  "Μόνο προσθήκη: καμία γραμμή δεν διορθώνεται ή σβήνεται. Κρατιέται όσο υπάρχει το σύστημα· με ανωνυμοποίηση GDPR το όνομα γίνεται «Ανωνυμοποιημένος Χρήστης».";
export const AUDIT_NO_ACCESS =
  "Το Ίχνος ενεργειών το βλέπει όποιος έχει το «Βλέπει ίχνος ενεργειών».";
export const AUDIT_LOAD_ERROR_TITLE = "Δεν φόρτωσε το Ίχνος ενεργειών";
export const AUDIT_LOAD_ERROR_TEXT = "Δεν χάθηκε τίποτα. Ξαναδοκίμασε σε λίγο.";
export const AUDIT_RETRY = "Ξαναδοκίμασε";
export const AUDIT_EMPTY_TITLE = "Καμία ενέργεια ακόμα";
export const AUDIT_EMPTY_TEXT =
  "Μόλις γίνει η πρώτη αλλαγή στο σύστημα, θα εμφανιστεί εδώ.";
export const AUDIT_NO_RESULTS_TITLE = "Κανένα αποτέλεσμα με αυτά τα φίλτρα";
export const AUDIT_CLEAR = "Καθαρισμός";
export const AUDIT_CLEAR_FILTERS = "Καθαρισμός φίλτρων";
export const AUDIT_APPLY = "Εφαρμογή";
export const AUDIT_OLDER = "Παλαιότερες";
export const AUDIT_FIRST_PAGE = "Από την αρχή";
export const AUDIT_FILTERS_LABEL = "Φίλτρα";
export const AUDIT_CHIPS_LABEL = "Ενεργά φίλτρα";
export const ALL_PEOPLE = "Όλοι";
export const ALL_AREAS = "Όλες";
export const ALL_ENTITIES = "Όλα";
export const ALL_ACTIONS = "Όλες";
export const SYSTEM_ACTOR = "Σύστημα";
export const MORE_CHANGES = (count: number): string => `+${count} ακόμα`;
export const REMOVE_FILTER = (label: string): string =>
  `Αφαίρεση φίλτρου ${label}`;

export const FILTER_LABELS: Readonly<Record<FilterKey, string>> = {
  who: "Ποιος",
  area: "Περιοχή",
  entity: "Στοιχείο",
  action: "Ενέργεια",
  period: "Περίοδος",
};

export const COLUMNS = {
  at: "Πότε",
  who: "Ποιος",
  area: "Περιοχή",
  subject: "Στοιχείο",
  action: "Ενέργεια",
  change: "Πριν → Μετά",
} as const;

// insert → προσθήκη, update → αλλαγή, delete → διαγραφή, event → ενέργεια (η «απόσυρση» είναι αλλαγή).
export const ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  insert: "προσθήκη",
  update: "αλλαγή",
  delete: "διαγραφή",
  event: "ενέργεια",
};

export const PERIOD_LABELS: Readonly<Record<AuditPeriod, string>> = {
  "7d": "7 μέρες",
  "30d": "30 μέρες",
  all: "Όλο",
};

export const HIDDEN_LABELS = {
  amount: "κρυφό ποσό",
  cost: "κρυφό κόστος",
} as const;
