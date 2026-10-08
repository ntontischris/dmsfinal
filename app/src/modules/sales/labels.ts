import type { DuplicateReason, ListName, Outcome } from "./types";

export const OUTCOME_LABELS: Readonly<Record<Outcome, string>> = {
  open: "Ανοιχτή",
  won: "Κερδισμένη",
  lost: "Χαμένη",
};

export const DUPLICATE_REASON_LABELS: Readonly<Record<DuplicateReason, string>> = {
  phone: "ίδιο τηλέφωνο",
  email_domain: "ίδιο domain email",
  name: "παρόμοιο όνομα",
};

export const LIST_LABELS: Readonly<Record<ListName, string>> = {
  stages: "Στάδια",
  sources: "Πηγές",
  loss_reasons: "Λόγοι απώλειας",
  activity_kinds: "Είδη Δραστηριότητας",
};

export const CLIENT_STATUS_LABEL = "Υποψήφιος"; // v1: χωρίς Συμφωνίες κάθε Πελάτης είναι Υποψήφιος
export const FORM_ROUTING_QUEUE_LABEL = "Χωρίς υπεύθυνο";
export const FORM_ROUTING_OWNER_LABEL = "Ιδιοκτήτης";
export const NO_MANAGER_LABEL = "Χωρίς υπεύθυνο";
