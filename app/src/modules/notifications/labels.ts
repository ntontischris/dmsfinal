// Τα κείμενα της A2 κατά το prototype (screens/A2.tsx, a2-inbox.tsx).

export const NOTIFICATIONS_TITLE = "Ειδοποιήσεις";
export const NOTIFICATIONS_EYEBROW = "A2 · Ειδοποιήσεις";
export const inboxTabLabel = (unread: number): string =>
  `Εισερχόμενα (${unread})`;
export const FILTER_LABEL = "Ποιες Ειδοποιήσεις";
export const FILTER_UNREAD = "Αδιάβαστες";
export const FILTER_ALL = "Όλες";
export const MARK_ALL_READ = "Όλες διαβασμένες";
export const NEW_BADGE = "Νέα";
export const OPEN_LABEL = "Άνοιγμα";
export const OLDER_LABEL = "Παλαιότερες";
export const ALL_NOTIFICATIONS = "Όλες οι ειδοποιήσεις";
export const EMPTY_TITLE = "Καμία Ειδοποίηση";
export const EMPTY_TEXT = "Όταν συμβεί κάτι που σε αφορά, θα το δεις εδώ.";
export const BELL_EMPTY = "Καμία Ειδοποίηση ακόμα.";
export const RETENTION_NOTE =
  "Οι Ειδοποιήσεις κρατιούνται 90 μέρες. Οι νεότερες είναι πρώτες· το «Άνοιγμα» ανοίγει το σχετικό και τη σημειώνει διαβασμένη.";
export const NO_ACCESS_TEXT =
  "Οι Ειδοποιήσεις φαίνονται σε Χρήστες της ομάδας και σε Χρήστες πελάτη με ενεργό Πελάτη.";
export const LOAD_ERROR_TITLE = "Οι Ειδοποιήσεις δεν φόρτωσαν";
export const LOAD_ERROR_TEXT = "Δεν χάθηκε τίποτα. Ανανέωσε τη σελίδα σε λίγο.";

// Γλώσσα των email του Χρήστη πελάτη (#171, Α8).
export const LANGUAGE_TITLE = "Γλώσσα των email";
export const LANGUAGE_LABEL = "Γλώσσα";
export const LANGUAGE_HINT = "Σε αυτή τη γλώσσα σου στέλνουμε τα email και τις Ειδοποιήσεις.";
export const LANGUAGE_OPTIONS = [
  { value: "el", label: "Ελληνικά" },
  { value: "en", label: "English" },
] as const;
export const LANGUAGE_SAVE = "Αποθήκευση";
export const LANGUAGE_SAVED = "Η γλώσσα αποθηκεύτηκε.";
export const LANGUAGE_UNCHANGED = "Δεν άλλαξε κάτι.";

// Δημόσια σελίδα διακοπής email (/u/<token>, #171, Α10). Δίγλωσση· ίδια απάντηση για κάθε token.
export const UNSUBSCRIBE_TITLE = "Διακοπή email · Unsubscribe";
export const UNSUBSCRIBE_TEXT_EL =
  "Πατήστε «Διακοπή» και δεν θα ξαναλάβετε αυτό το είδος email. Τα απαραίτητα email (π.χ. Τιμολόγια) συνεχίζουν να έρχονται.";
export const UNSUBSCRIBE_TEXT_EN =
  "Press “Unsubscribe” and you will not receive this kind of email again. Essential emails (e.g. invoices) keep coming.";
export const UNSUBSCRIBE_BUTTON = "Διακοπή · Unsubscribe";
export const UNSUBSCRIBE_DONE =
  "Έγινε. Δεν θα ξαναλάβετε αυτό το είδος email. · Done. You will not receive this kind of email again.";
export const UNSUBSCRIBE_ERROR =
  "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο. · Something went wrong. Please try again shortly.";
