import type { SendState } from "./sends-schema";

// Τα κείμενα του Ιστορικού αποστολών κατά το prototype (screens/K3.tsx, k3-table.tsx, b2-sections.tsx).

export const SENDS_TITLE = "Ιστορικό αποστολών";
export const SENDS_EYEBROW = "K3 · Ειδοποιήσεις και Αυτοματισμοί";
export const SENDS_NO_ACCESS =
  "Το Ιστορικό αποστολών το βλέπει όποιος «Διαχειρίζεται Αυτοματισμούς» ή «Βλέπει Υγεία συστήματος».";
export const SENDS_LOAD_ERROR_TITLE = "Το Ιστορικό αποστολών δεν φόρτωσε";
export const SENDS_LOAD_ERROR_TEXT =
  "Δεν χάθηκε τίποτα. Ανανέωσε τη σελίδα σε λίγο.";
export const SENDS_TABS_LABEL = "Ιστορικό αποστολών";
export const SENDS_EMPTY_TITLE = "Καμία αποστολή εδώ";
export const SENDS_EMPTY_TEXT = "Δεν υπάρχει τίποτα για αυτά τα φίλτρα.";
export const SENDS_OLDER = "Παλαιότερα";
export const SENDS_LATER = "Επόμενα";
export const SENDS_RETENTION =
  "Κρατιέται 12 μήνες: μόνο τι, σε ποιον, πότε και αποτέλεσμα, όχι το σώμα του μηνύματος. Ο πελάτης δεν βλέπει Ιστορικό. Ανά Πελάτη υπάρχει στη Σελίδα Πελάτη, καρτέλα «Αποστολές».";

export const tabLabel = (
  tab: "sent" | "scheduled" | "failed",
  failed: number,
): string =>
  tab === "sent"
    ? "Στάλθηκαν"
    : tab === "scheduled"
      ? "Προγραμματισμένα"
      : `Απέτυχαν (${failed})`;

export const TAB_NOTES = {
  sent: "Εδώ φαίνονται όσα έφυγαν (και όσα δεν έφυγαν).",
  scheduled:
    "Τα προγραμματισμένα υπολογίζονται ξανά αν αλλάξει η ημερομηνία του Γεγονότος. Δείχνουν τις επόμενες 14 μέρες.",
  failed:
    "Το «Ξαναστείλε» στέλνει την ίδια αποστολή μία φορά, δεν φτιάχνει δεύτερη.",
} as const;

export const FILTER_CLIENT = "Πελάτης";
export const FILTER_CLIENT_ALL = "όλοι";
export const FILTER_APPLY = "Εφαρμογή";
export const FILTER_CHANNEL = "Κανάλι";
export const FILTER_CHANNEL_ALL = "όλα";

export const CHANNEL_LABELS = {
  notification: "Ειδοποίηση",
  email: "email",
} as const;

export const STATE_LABELS: Readonly<Record<SendState, string>> = {
  scheduled: "προγραμματισμένο",
  sent: "στάλθηκε",
  retrying: "ξαναδοκιμάζεται",
  failed: "απέτυχε",
  not_sent: "δεν στάλθηκε",
  ignored: "αγνοήθηκε",
};

export const COLUMNS = {
  when: "Πότε",
  what: "Τι",
  source: "Πηγή",
  channel: "Κανάλι",
  recipient: "Παραλήπτης",
  state: "Κατάσταση",
  reason: "Λόγος",
  attempts: "Προσπάθειες",
  action: "Ενέργεια",
} as const;

export const SOURCE_AUTOMATION = "Αυτοματισμός";
export const SOURCE_SYSTEM = "Μήνυμα συστήματος";
export const RETRY_LABEL = "Ξαναστείλε";
export const RETRY_CONFIRM = "Να ξανασταλεί αυτό το email; Γίνεται μία φορά.";
export const RETRY_CONFIRM_YES = "Ναι, ξαναστείλε";
export const RETRY_CANCEL = "Άκυρο";
export const RETRY_DONE = "Το email μπήκε ξανά στην ουρά.";
export const RETRIED_NOTE = "Ξαναστάλθηκε";

export const recipientsCount = (count: number): string =>
  `${count} ${count === 1 ? "παραλήπτης" : "παραλήπτες"}`;

// Τα είδη των Μηνυμάτων συστήματος και των παλιών email (πριν από τους Αυτοματισμούς).
export const KIND_LABELS: Readonly<Record<string, string>> = {
  test: "Δοκιμαστικό email",
  invite_resend: "Πρόσκληση (ξανά)",
  client_added: "Προσθήκη σε Πελάτη",
  invite: "Πρόσκληση",
  magiclink: "Σύνδεσμος εισόδου",
  recovery: "Επαναφορά κωδικού",
  signup: "Επιβεβαίωση εγγραφής",
  proposal_link: "Σύνδεσμος πρότασης",
  signing_code: "Κωδικός υπογραφής",
  signed_copy: "Αντίγραφο υπογεγραμμένης Συμφωνίας",
  client_invite: "Πρόσκληση Υπογράφοντα",
  filming_decision: "Απόφαση για Γύρισμα",
  reschedule_decision: "Απόφαση για μετάθεση",
  sheet_issued: "Δελτίο γυρίσματος",
  crew_declined: "«Δεν μπορώ» Συνεργείου",
  deliverable_version_sent: "Νέα Έκδοση",
  production_delivered: "Παράδοση Παραγωγής",
  deliverable_reminder: "Υπενθύμιση Έκδοσης",
  invoice_registered: "Νέο Τιμολόγιο",
  invoice_overdue: "Ληξιπρόθεσμο Τιμολόγιο",
  message_digest: "Σύνοψη Μηνυμάτων",
  request_closed: "Κλείσιμο Αιτήματος",
};

// Καρτέλα «Αποστολές» του Πελάτη (B2).
export const CLIENT_SENDS_TAB = "Αποστολές";
export const CLIENT_SENDS_TITLE = "Αποστολές προς τους Χρήστες του Πελάτη";
export const CLIENT_SENDS_EMPTY =
  "Καμία αποστολή προς τους Χρήστες του Πελάτη ακόμα.";
export const CLIENT_SENDS_NOTE =
  "Μόνο ό,τι πήγε στους Χρήστες του Πελάτη, χωρίς το περιεχόμενο. Οι Ειδοποιήσεις της ομάδας είναι στο Ιστορικό αποστολών.";
