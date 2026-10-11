import type {
  CancelOutcome,
  Charge,
  DeliverableState,
  QueueView,
  VersionState,
} from "./types";

// Κείμενα του module: οι κωδικοί της βάσης σε ελληνικά, όπως στο prototype.

export const STATE_LABELS: Readonly<Record<DeliverableState, string>> = {
  draft: "Χωρίς Έκδοση",
  in_review: "Αναμένει εσωτερικό έλεγχο",
  returned: "Επιστράφηκε από έλεγχο",
  awaiting_client: "Αναμένει πελάτη",
  changes_requested: "Χρειάζεται αλλαγές",
  approved: "Εγκρίθηκε",
  superseded: "Αντικαταστάθηκε",
  cancelled: "Ακυρώθηκε",
};

export const VERSION_STATE_LABELS: Readonly<Record<VersionState, string>> = {
  in_review: "Αναμένει εσωτερικό έλεγχο",
  returned: "Επιστράφηκε από έλεγχο",
  awaiting_client: "Αναμένει πελάτη",
  approved: "Εγκρίθηκε",
  changes_requested: "Χρειάζεται αλλαγές",
  superseded: "Αντικαταστάθηκε",
};

export const CHARGE_LABELS: Readonly<Record<Charge, string>> = {
  included: "Από την Παροχή",
  free: "Χωρίς χρέωση",
  charged: "Χρεώνεται",
  pending: "Να αποφασιστεί χρέωση",
};

export const CANCEL_OUTCOME_LABELS: Readonly<Record<CancelOutcome, string>> = {
  consumed: "Η Παροχή καταναλώθηκε",
  returned: "Επιστρέφει στην Περίοδο",
};

export const QUEUE_LABELS: Readonly<Record<QueueView, string>> = {
  mine: "Για μένα",
  review: "Προς έλεγχο",
  client: "Στον πελάτη",
};

export const QUEUE_EMPTY: Readonly<
  Record<QueueView, { title: string; text: string }>
> = {
  mine: {
    title: "Τίποτα δεν περιμένει εσένα.",
    text: "Δεν υπάρχει Παραδοτέο που να περιμένει εσένα αυτή τη στιγμή.",
  },
  review: {
    title: "Καμία Έκδοση δεν περιμένει έλεγχο.",
    text: "Όταν κάποιος προσθέσει Έκδοση, θα εμφανιστεί εδώ.",
  },
  client: {
    title: "Τίποτα δεν περιμένει πελάτη.",
    text: "Κανένα Παραδοτέο δεν αναμένει απάντηση πελάτη.",
  },
};

export const CLIENT_QUEUE_NOTE =
  "Αν ο πελάτης ενέκρινε τηλεφωνικά, ζήτησέ του να πατήσει το κουμπί στο email, ή παράδωσε την Παραγωγή χειροκίνητα με σχόλιο.";

export const NO_ASSIGNEE_LABEL = "Χωρίς υπεύθυνο";
export const NO_FILMING_LABEL = "Χωρίς Γύρισμα";
export const INTERNAL_LABEL = "Εσωτερική";
export const NO_DEADLINE_LABEL = "Χωρίς ημερομηνία";
