// Ελληνικά κείμενα των Μηνυμάτων (J1, J2), κατά το prototype.

export const INBOX_EYEBROW = "J1 · Εισερχόμενα";
export const INBOX_TITLE = "Εισερχόμενα";
export const INBOX_NO_ACCESS_TEXT = "Τα Εισερχόμενα είναι για την ομάδα.";
export const INBOX_ERROR_TITLE = "Τα Εισερχόμενα δεν φόρτωσαν";
export const INBOX_ERROR_TEXT = "Δεν χάθηκε τίποτα. Δοκίμασε ξανά σε λίγο.";
export const INBOX_TABS_LABEL = "Εισερχόμενα";

export const TAB_CONVERSATIONS = "Συνομιλίες";
export const TAB_MENTIONS = "Με ανέφεραν";

export const CONVERSATIONS_EMPTY_TITLE = "Καμία Συνομιλία ακόμα";
export const CONVERSATIONS_EMPTY_TEXT =
  "Οι Συνομιλίες εμφανίζονται όταν γράψει ένας Πελάτης ή η ομάδα.";
export const MENTIONS_EMPTY_TITLE = "Κανείς δεν σε ανέφερε";
export const MENTIONS_EMPTY_TEXT = "Οι @αναφορές προς εσένα εμφανίζονται εδώ.";

export const UNREAD_NOTE =
  "Τα αδιάβαστα είναι μόνο δικά σου· κανείς δεν βλέπει τι διάβασαν οι άλλοι.";
export const MENTIONS_NOTE =
  "Η @αναφορά σού δείχνει μόνο εκείνο το Εσωτερικό Μήνυμα, όχι όλη τη Συνομιλία.";
export const SCOPE_NOTE =
  "Βλέπεις ολόκληρη τη Συνομιλία των Πελατών όπου είσαι Υπεύθυνος. Στους υπόλοιπους βλέπεις μόνο Μηνύματα με την ετικέτα των Παραγωγών όπου είσαι Μέλος, και όσα σε ανέφεραν.";

export const NEW_MESSAGE_LABEL = "Νέο Μήνυμα προς";
export const NEW_MESSAGE_CTA = "Νέο Μήνυμα";
export const PARTIAL_BADGE = "μόνο ό,τι σε αφορά";
export const OPEN_LABEL = "Άνοιγμα";

export const THREAD_EYEBROW = "J2 · Συνομιλία";
export const THREAD_NO_ACCESS_TEXT = "Η Συνομιλία είναι για την ομάδα.";
export const THREAD_MISSING_TITLE = "Δεν βρέθηκε Συνομιλία";
export const THREAD_MISSING_TEXT =
  "Ή δεν υπάρχει ή δεν έχεις Μηνύματα σε αυτήν. Γύρνα στα Εισερχόμενα.";
export const THREAD_ERROR_TITLE = "Η Συνομιλία δεν φόρτωσε";
export const BACK_TO_INBOX = "Όλες οι Συνομιλίες";
export const MANAGER_LABEL = "Υπεύθυνος Πελάτη";
export const STATUS_LABEL = "Κατάσταση";
export const NO_MANAGER = "Χωρίς υπεύθυνο";

export const CLIENT_STATUS: Readonly<Record<string, string>> = {
  candidate: "υποψήφιος",
  active: "ενεργός",
  inactive: "ανενεργός",
};

export const FILTERS_LABEL = "Φίλτρα";
export const FILTER_ALL = "Όλα";
export const FILTER_UNTAGGED = "Χωρίς ετικέτα";
export const FILTER_INTERNAL = "Εσωτερικά";
export const FILTER_CLEAR = "Καθαρισμός φίλτρου";
export const FILTERING_PREFIX = "Φιλτράρισμα";

export const PARTIAL_BANNER =
  "Βλέπεις μόνο τα Μηνύματα με την ετικέτα των Παραγωγών σου και όσα σε ανέφεραν. Τιμές και ανανεώσεις συζητιούνται χωρίς ετικέτα και τις βλέπει ο Υπεύθυνος Πελάτη.";

export const THREAD_EMPTY_TITLE = "Κανένα Μήνυμα ακόμα";
export const THREAD_EMPTY_TEXT =
  "Η Συνομιλία υπάρχει για κάθε Πελάτη, ακόμα και αν είναι Ανενεργός. Το πρώτο Μήνυμα την ξεκινά.";
export const FILTER_EMPTY_TITLE = "Κανένα Μήνυμα σε αυτό το φίλτρο.";

export const THREAD_FOOTER =
  "Μία Συνομιλία ανά Πελάτη (ADR 0012). Τα Εσωτερικά Μηνύματα δεν φτάνουν ποτέ στον πελάτη. Δεν υπάρχουν αποδείξεις ανάγνωσης: κανείς δεν βλέπει ποιος διάβασε. Όταν ένα Μέλος αφαιρείται από μια Παραγωγή, χάνει αμέσως την πρόσβαση στα Μηνύματα της ετικέτας.";

export const MESSAGE_TO_CLIENT = "προς πελάτη";
export const MESSAGE_INTERNAL = "Εσωτερικό · δεν το βλέπει ο πελάτης";
export const MESSAGE_DELETED = "Το Μήνυμα διαγράφηκε.";
export const MESSAGE_EDITED = "διορθώθηκε";
export const MESSAGE_NEW = "νέο";
export const MESSAGE_MENTIONS = "Αναφορά σε";

export const ACTION_TAG = "Αλλαγή ετικέτας";
export const ACTION_EDIT = "Διόρθωση";
export const ACTION_DELETE = "Διαγραφή";
export const ACTION_SAVE = "Αποθήκευση";
export const DELETE_WARNING = "Το Μήνυμα θα φαίνεται σε όλους ως διαγραμμένο και δεν επανέρχεται.";
export const NO_TAG = "χωρίς ετικέτα";

export const COMPOSER_LABEL = "Νέο Μήνυμα";
export const COMPOSER_RECIPIENT = "Παραλήπτης";
export const COMPOSER_TO_CLIENT = "Προς πελάτη";
export const COMPOSER_INTERNAL = "Εσωτερικό Μήνυμα";
export const COMPOSER_INTERNAL_WARNING = "Δεν το βλέπει ο πελάτης";
export const COMPOSER_TAG = "Ετικέτα";
export const COMPOSER_PLACEHOLDER = "Γράψε το Μήνυμα…";
export const COMPOSER_MENTION = "Αναφορά σε…";
export const COMPOSER_MENTION_HINT =
  "Οι @αναφορές γίνονται μόνο σε Εσωτερικά Μηνύματα";
export const COMPOSER_REMOVE_MENTION = "Αφαίρεση";
export const COMPOSER_SEND = "Αποστολή";
export const COMPOSER_SENDING = "Αποστολή…";
export const COMPOSER_READONLY = "Δεν μπορείς να γράψεις σε αυτή τη Συνομιλία.";

export const editWindowNote = (minutes: number): string =>
  `μπορείς να το διορθώσεις για ${minutes} λεπτά`;

export const unreadBadge = (count: number): string => `${count} αδιάβαστα`;
export const tabLabel = (name: string, count: number): string =>
  `${name} (${count})`;

// Η Συνομιλία του πελάτη (J3).
export const CLIENT_EYEBROW = "J3 · Μηνύματα";
export const CLIENT_TITLE = "Μηνύματα";
export const CLIENT_ERROR_TITLE = "Τα Μηνύματα δεν φόρτωσαν";
export const CLIENT_ERROR_TEXT = "Δεν χάθηκε τίποτα. Δοκίμασε ξανά σε λίγο.";
export const CLIENT_TABS_LABEL = "Μηνύματα";
export const CLIENT_TAB_CONVERSATION = "Συνομιλία";
export const CLIENT_EMPTY_TITLE = "Καμία συζήτηση ακόμα";
export const CLIENT_EMPTY_TEXT = "Γράψε το πρώτο σου Μήνυμα στην ομάδα";
export const CLIENT_NO_ACCESS_TEXT =
  "Τα Μηνύματα φαίνονται σε Χρήστες πελάτη με το Δικαίωμα «Βλέπει Συνομιλία».";
export const CLIENT_READONLY_NOTE =
  "Έχεις μόνο «Βλέπει Συνομιλία»: διαβάζεις, αλλά δεν γράφεις ούτε δηλώνεις Αιτήματα. Ζήτα το Δικαίωμα από τον διαχειριστή του λογαριασμού σας.";
export const CLIENT_COMPOSER_TEXT = "Μήνυμα προς την ομάδα";
export const CLIENT_COMPOSER_TAG = "Για ποια Παραγωγή;";
export const CLIENT_NO_TAG = "Γενικά, χωρίς Παραγωγή";
export const CLIENT_NOTES_TITLE = "Ειδοποιήσεις";
export const clientEditFooter = (minutes: number): string =>
  `Διορθώνεις ένα Μήνυμα για ${minutes} λεπτά.`;
export const clientDigestNote = (minutes: number): string =>
  `Παίρνεις ειδοποίηση μέσα στο DMS για κάθε νέο Μήνυμα της ομάδας. Αν μείνουν αδιάβαστα για ${minutes} λεπτά, έρχεται ένα μόνο συγκεντρωτικό email με κουμπί «Απάντησε στο DMS». Η απάντηση στο ίδιο το email δεν φτάνει στην ομάδα.`;
export const CLIENT_VIDEO_NOTE =
  "Σχόλια πάνω στο video γράφονται στο Παραδοτέο, όχι εδώ.";
export const ACTION_CANCEL = "Ακύρωση";
