// Ελληνικά κείμενα των Αιτημάτων (J1 καρτέλα, J2 request box, J3), κατά το prototype.

export const REQUEST_KIND_LABELS = {
  deliverable: "Νέο Παραδοτέο",
  filming: "Γύρισμα",
  other: "Άλλο",
  change: "Αλλαγή μετά την έγκριση",
} as const;

export const REQUEST_STATE_LABELS = {
  open: "ανοιχτό",
  done: "ολοκληρώθηκε",
  rejected: "απορρίφθηκε",
} as const;

export const TAB_REQUESTS = "Αιτήματα";
export const REQUESTS_VIEWS_LABEL = "Όψη Αιτημάτων";

export const VIEW_LABELS = {
  mine: "για μένα",
  open: "όλα τα ανοιχτά",
  unassigned: "χωρίς υπεύθυνο",
  closed: "κλεισμένα",
} as const;

export const REQUESTS_EMPTY = {
  mine: "Κανένα ανοιχτό Αίτημα για σένα.",
  open: "Κανένα ανοιχτό Αίτημα.",
  unassigned: "Κανένα Αίτημα χωρίς υπεύθυνο.",
  closed: "Κανένα κλεισμένο Αίτημα ακόμα.",
} as const;

export const UNASSIGNED_NOTE =
  "Εδώ πέφτουν τα Αιτήματα χωρίς ετικέτα Παραγωγής και χωρίς Υπεύθυνο Πελάτη. Τα μοιράζουν όσοι «Μεταβιβάζουν Υπεύθυνο».";
export const ASSIGNMENT_NOTE =
  "Το Αίτημα πάει στον υπεύθυνο της Παραγωγής της ετικέτας, αλλιώς στον Υπεύθυνο του Πελάτη, αλλιώς μένει «Χωρίς υπεύθυνο». Η αλλαγή ετικέτας δεν αλλάζει υπεύθυνο.";
export const REQUESTS_ERROR_TITLE = "Τα Αιτήματα δεν φόρτωσαν";

export const STALE_BADGE = "χρειάζεται προσοχή";
export const NO_ASSIGNEE = "Χωρίς υπεύθυνο";
export const assigneeText = (name: string | null): string =>
  `Υπεύθυνος: ${name ?? NO_ASSIGNEE}`;
export const daysOpenText = (days: number): string =>
  days === 0
    ? "ανοιχτό από σήμερα"
    : days === 1
      ? "ανοιχτό 1 μέρα"
      : `ανοιχτό ${days} μέρες`;
export const AUTO_CLOSED = "έκλεισε μόνο του όταν δημιουργήθηκε";
export const OPEN_REQUEST = "Άνοιγμα";

export const LABEL_LINK = "Σύνδεσμος";
export const LABEL_COMMENT = "Σχόλιο";
export const LABEL_REPLY = "Απάντηση προς τον πελάτη";
export const OPEN_RESULT_DELIVERABLE = "Άνοιγμα Παραδοτέου";
export const OPEN_RESULT_FILMING = "Άνοιγμα Γυρίσματος";

// Request box (J2).
export const requestTitle = (kind: string): string => `Αίτημα: ${kind}`;
export const DECLARED_BY_TEAM = "σημειώθηκε ως Αίτημα από την ομάδα";
export const ASSIGNED_TO = "Ανατέθηκε";
export const MARK_REQUEST = "Σημείωσε ως Αίτημα";
export const MARK_KIND_LABEL = "Είδος Αιτήματος";
export const MARK_SAVE = "Σημείωση Αιτήματος";
export const CREATE_DELIVERABLE = "Δημιουργία Παραδοτέου από το Αίτημα";
export const CREATE_DELIVERABLE_SUBMIT = "Δημιουργία και κλείσιμο Αιτήματος";
export const CREATE_DELIVERABLE_NEEDS_TAG =
  "Για να δημιουργηθεί Παραδοτέο, βάλε πρώτα ετικέτα Παραγωγής στο Μήνυμα (Αλλαγή ετικέτας).";
export const CREATE_DELIVERABLE_NO_ACCESS =
  "Δεν μπορείς να δημιουργήσεις Παραδοτέο σε αυτή την Παραγωγή.";
export const CLOSE_FILMING = "Κλείσιμο Γυρίσματος από το Αίτημα";
export const COMPLETE = "Ολοκληρώθηκε";
export const REJECT = "Απόρριψη";
export const LINK_PLACEHOLDER = "Σύνδεσμος (link)";
export const COMMENT_PLACEHOLDER = "Σχόλιο";
export const COMPLETE_NOTE = "Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο.";
export const COMPLETE_SUBMIT = "Ολοκλήρωση Αιτήματος";
export const REPLY_PLACEHOLDER = "Απάντηση προς τον πελάτη (υποχρεωτική)";
export const REPLY_NOTE = "Η απάντηση πηγαίνει στον πελάτη.";
export const REJECT_SUBMIT = "Απόρριψη Αιτήματος";
export const REASSIGN = "Αλλαγή υπευθύνου";
export const REASSIGN_SAVE = "Αποθήκευση υπευθύνου";
export const REQUEST_NOT_DELETABLE =
  "Το Μήνυμα έγινε Αίτημα και δεν διαγράφεται.";

// Αλλαγή μετά την έγκριση, στο νήμα (Μ12).
export const CHANGE_TITLE = "Αίτημα αλλαγής μετά την έγκριση";
export const CHANGE_NOTE =
  "Η απόφαση (δεκτό ως γύρος, χρεώνεται ή νέο Παραδοτέο) παίρνεται στη σελίδα του Παραδοτέου και κλείνει το Αίτημα.";
export const CHANGE_DECIDED = "Αποφασίστηκε στη σελίδα του Παραδοτέου.";
export const changeAbout = (title: string): string => `Παραδοτέο: ${title}`;

// Πλαϊνό «Αιτήματα αυτού του Πελάτη».
export const SIDE_TITLE = "Αιτήματα αυτού του Πελάτη";
export const SIDE_EMPTY = "Κανένα Αίτημα.";
export const SIDE_CHANGE = "Αλλαγή μετά την έγκριση";

// Πελάτης (J3).
export const CLIENT_TAB_REQUESTS = (open: number): string =>
  `Αιτήματα (${open} ανοιχτά)`;
export const CLIENT_REQUESTS_EMPTY_TITLE = "Δεν έχεις στείλει Αίτημα";
export const CLIENT_REQUESTS_EMPTY_TEXT =
  "Όταν ζητήσεις κάτι από τη Συνομιλία, θα το βρεις εδώ.";
export const CLIENT_SEE_IN_CHAT = "Δες στη Συνομιλία";
export const CLIENT_TEAM_REPLY = "Απάντηση της ομάδας";
export const CLIENT_REQUEST_SENT =
  "Το Αίτημα στάλθηκε. Θα δεις εδώ πότε ολοκληρωθεί ή αν απορριφθεί.";
export const CLIENT_REQUEST_CHECKBOX = "Ζητώ κάτι να γίνει (Αίτημα)";
export const CLIENT_REQUEST_KIND = "Είδος Αιτήματος";
export const CLIENT_HINT_FILMING =
  "Αν μπορείς να κλείσεις το Γύρισμα μόνος σου, κάνε το πρώτα εδώ:";
export const CLIENT_HINT_FILMING_LINK = "Κλείσε Γύρισμα";
export const CLIENT_HINT_CHANGE =
  "Για αλλαγή σε εγκεκριμένο Παραδοτέο, ζήτα την από το ίδιο το Παραδοτέο:";
export const CLIENT_HINT_CHANGE_LINK = "Άνοιξε το Παραδοτέο";
export const CLIENT_DELIVERABLE_LINK = "Άνοιγμα Παραδοτέου";
export const CLIENT_FILMING_LINK = "Άνοιγμα Γυρίσματος";
export const CLIENT_DONE_AUTO =
  "Το Παραδοτέο ή το Γύρισμα που ζητήσατε δημιουργήθηκε.";
export const CLIENT_CHANGE_OPEN = "Η ομάδα εξετάζει την αλλαγή.";
export const CLIENT_CHANGE_DONE =
  "Η ομάδα αποφάσισε για την αλλαγή. Δες το Παραδοτέο.";
