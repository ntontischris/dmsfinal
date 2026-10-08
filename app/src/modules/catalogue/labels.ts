import type { Billing, Measure, MonthStatus, NewItemType } from "./types";

// Κείμενα του module που τα χρησιμοποιούν πολλές οθόνες.

export const BILLING_LABELS: Readonly<Record<Billing, string>> = {
  monthly: "μηνιαίο",
  one_off: "εφάπαξ",
};

export const MEASURE_LABELS: Readonly<Record<Measure, string>> = {
  per_filming: "ανά Γύρισμα",
  per_hour: "ανά ώρα",
  per_day: "ανά μέρα",
};

export const NEW_ITEM_TYPE_LABELS: Readonly<Record<NewItemType, string>> = {
  package_monthly: "Πακέτο μηνιαίο",
  package_one_off: "Πακέτο εφάπαξ",
  service: "Υπηρεσία",
};

export const MONTH_STATUS_LABELS: Readonly<Record<MonthStatus, string>> = {
  closed: "Κλεισμένος",
  current: "Τρέχων",
  future: "Επόμενος",
};

export const FORWARD_NOTE =
  "Η αλλαγή ισχύει για νέες προτάσεις· οι υπογεγραμμένες Συμφωνίες κρατούν το δικό τους αντίγραφο.";
export const COST_INTERNAL_NOTE =
  "Οι ώρες και το κόστος είναι εσωτερικά· ο πελάτης βλέπει μόνο Παροχές.";
export const NOT_PRICED_LABEL = "—"; // κελί χωρίς τιμή / κόστος που δεν υπολογίζεται
