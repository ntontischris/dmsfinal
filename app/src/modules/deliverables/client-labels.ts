import type { ClientDeliverableState } from "./client-types";

// Ελληνικά κείμενα της όψης πελάτη (H3, H4). Δεν εμφανίζονται ονόματα ή αριθμοί που ο πελάτης δεν βλέπει.

export const CLIENT_STATE_LABELS: Readonly<Record<ClientDeliverableState, string>> = {
  in_progress: "Σε εργασία",
  awaiting_you: "Περιμένει εσένα",
  changes_requested: "Ζητήθηκαν αλλαγές",
  approved: "Εγκρίθηκε",
  cancelled: "Ακυρώθηκε",
};

export const CLIENT_QUEUE_HINT = "Για νέο Παραδοτέο, στείλε μας Μήνυμα.";
export const IN_PROGRESS_NOTE = "Σε εργασία: η ομάδα δουλεύει ακόμα σε αυτή την Έκδοση.";
export const LINK_REPORTED_NOTE = "Το αναφέραμε στην ομάδα.";
export const APPROVAL_FINAL_NOTE = "Η έγκριση είναι τελική.";
export const REQUEST_PENDING_NOTE = "Το αίτημά σου περιμένει απάντηση.";
export const EMPTY_QUEUE_NOTE = "Κανένα Παραδοτέο δεν περιμένει εσένα αυτή τη στιγμή.";
export const NO_DELIVERABLES_NOTE = "Κανένα Παραδοτέο ακόμα.";
