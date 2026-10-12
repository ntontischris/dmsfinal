// Τα κείμενα της K1, της K2 και των Προτιμήσεων κατά το prototype (screens/K1, k1-*, K2, k2-*, a2-prefs).

export const K1_EYEBROW = "K1 · Αυτοματισμοί";
export const K2_EYEBROW = "K2 · Μηνύματα συστήματος";
export const SETTINGS_TITLE = "Ρυθμίσεις";
export const AUTOMATIONS_PATH = "/app/settings/automations";
export const SYSTEM_MESSAGES_PATH = "/app/settings/system-messages";
export const PREFS_PATH = "/app/notifications?tab=prefs";

export const NO_MANAGE_TEXT =
  "Τους Αυτοματισμούς και τα Μηνύματα συστήματος τα διαχειρίζεται όποιος «Διαχειρίζεται Αυτοματισμούς». Τις δικές σου ειδοποιήσεις τις ρυθμίζεις από τις Προτιμήσεις.";
export const LOAD_FAILED_TITLE = "Δεν φόρτωσαν οι Αυτοματισμοί";
export const LOAD_FAILED_TEXT = "Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.";
export const K1_NOTE =
  "Κανένας δεν ειδοποιείται για ό,τι έκανε ο ίδιος. Ένα νέο Γεγονός χρειάζεται προγραμματιστή· εδώ αλλάζεις μόνο Αυτοματισμούς και κείμενα. Κάθε αλλαγή γράφεται στο Ίχνος ενεργειών.";

export const KIND_LABELS = {
  instant: "στιγμιαίο",
  dated: "με ημερομηνία",
  waiting: "αναμονής",
} as const;
export const CHANNEL_LABELS = {
  notification: "Ειδοποίηση",
  email: "Email",
} as const;

export const RECIPIENT_KIND_LABELS = {
  relative: "Σε σχέση με το Γεγονός",
  permission: "Όσοι έχουν Δικαίωμα",
  users: "Ονομαστικά",
  visitor: "Ο Επισκέπτης της φόρμας",
} as const;

export const RELATIVE_LABELS: Readonly<Record<string, string>> = {
  client: "Ο πελάτης",
  crew: "Το Συνεργείο",
  actor: "Όποιος το έκανε",
  owner: "Ο Ιδιοκτήτης",
  production_owner: "Ο Υπεύθυνος Παραγωγής",
  production_members: "Τα μέλη της Παραγωγής",
  client_owner: "Ο Υπεύθυνος Πελάτη",
  assignee: "Ο ανατεθειμένος",
  requester: "Όποιος το ζήτησε",
  mentioned: "Όσοι αναφέρθηκαν",
  opportunity_owner: "Ο Υπεύθυνος Ευκαιρίας",
  approval_requester: "Όποιος ζήτησε την Έγκριση",
  sheet_issuer: "Όποιος εξέδωσε το Δελτίο",
  request_client: "Ο πελάτης του Αιτήματος",
  filming_requester: "Όποιος έκλεισε ή ζήτησε τη μετάθεση",
  self: "Ο Χρήστης πελάτη με τα αδιάβαστα",
};

export const WAIT_UNITS = [
  { value: "minutes", label: "λεπτά", minutes: 1 },
  { value: "hours", label: "ώρες", minutes: 60 },
  { value: "days", label: "μέρες", minutes: 1440 },
] as const;

export const FILTER_GROUP_LABEL = "Ομάδα Γεγονότων";
export const FILTER_ONLY_LABEL = "Φίλτρο";
export const ALL_GROUPS = "Όλες οι ομάδες";
export const ONLY_ALL = "Όλα";
export const ONLY_ACTIVE = "Μόνο με ενεργούς";
export const ONLY_WIRED = "Μόνο συνδεδεμένα";
export const WIRED_LATER = "συνδέεται αργότερα";
export const COST_BADGE = "κόστος";
export const EMPTY_FILTER_TITLE = "Κανένα Γεγονός δεν ταιριάζει";
export const EMPTY_FILTER_TEXT = "Άλλαξε ή καθάρισε τα φίλτρα.";
export const BACK_TO_CATALOGUE = "Πίσω στον κατάλογο";
export const NO_EVENT_TITLE = "Δεν υπάρχει αυτό το Γεγονός";

export const ADD_AUTOMATION = "Προσθήκη Αυτοματισμού";
export const NEW_AUTOMATION_TITLE = "Νέος Αυτοματισμός";
export const NO_AUTOMATION_TITLE = "Αυτό το Γεγονός δεν έχει Αυτοματισμό";
export const SAVE_AUTOMATION = "Αποθήκευση";
export const AUTOMATION_SAVED = "Ο Αυτοματισμός αποθηκεύτηκε.";
export const AUTOMATION_ADDED = "Ο Αυτοματισμός προστέθηκε.";
export const ENABLED_LABEL = "Ενεργός";
export const ENABLED_ON = "Ο Αυτοματισμός άναψε.";
export const ENABLED_OFF = "Ο Αυτοματισμός σβήστηκε.";
export const DELETE_LABEL = "Διαγραφή";
export const DELETE_CONFIRM = "Ναι, διαγραφή";
export const DELETED = "Ο Αυτοματισμός διαγράφηκε.";
export const INITIAL_NOTE =
  "Οι αρχικοί Αυτοματισμοί δεν διαγράφονται, μόνο σβήνουν.";
export const ESSENTIAL_LABEL = "Απαραίτητο: ο πελάτης δεν μπορεί να το σβήσει";
export const VARIABLES_TITLE = "Μεταβλητές";
export const VARIABLES_NOTE =
  "Γράφονται σε άγκιστρα και είναι ίδιες στα ελληνικά και στα αγγλικά κείμενα. Μια άγνωστη μεταβλητή δεν αποθηκεύεται. Τα ποσά δεν φτάνουν σε όσους δεν βλέπουν ποσά.";
export const INSERT_VARIABLE = "Εισαγωγή μεταβλητής";
export const COST_NOTE =
  "Γεγονός κόστους: φτάνει μόνο σε όσους βλέπουν κόστος, όποιους παραλήπτες κι αν διαλέξεις.";
export const UNWIRED_NOTE =
  "Αυτό το Γεγονός συνδέεται αργότερα: οι Αυτοματισμοί του αποθηκεύονται, αλλά δεν στέλνουν ακόμα τίποτα.";
export const MISSING_EN_BADGE = "χωρίς αγγλικό";
export const ESSENTIAL_BADGE = "απαραίτητο";

export const HOLIDAYS_NOTE =
  "Οι 13 επίσημες αργίες με τις κινητές του Πάσχα. Σβήνεις όποια δεν θες να φεύγει ευχή· όσες πρόσθεσες εσύ φαίνονται με σήμα.";
export const HOLIDAY_ADDED_BADGE = "πρόσθεσες εσύ";
export const ADD_HOLIDAY = "Προσθήκη αργίας";
export const HOLIDAY_SAVED = "Οι Αργίες αποθηκεύτηκαν.";

export const MESSAGES_TABS_LABEL = "Αυτοματισμοί και Μηνύματα συστήματος";
export const ALWAYS_ON = "πάντα ενεργό";
export const EDITED_BADGE = "αλλαγμένο κείμενο";
export const EDIT_LABEL = "Επεξεργασία";
export const ALL_SYSTEM_MESSAGES = "Όλα τα Μηνύματα συστήματος";
export const SYSTEM_SAVED = "Το κείμενο αποθηκεύτηκε.";
export const SYSTEM_RESET = "Επαναφορά αρχικού κειμένου";
export const SYSTEM_RESET_DONE = "Επανήλθε το αρχικό κείμενο.";
export const SYSTEM_NO_SWITCH =
  "Δεν υπάρχει διακόπτης: αυτό το μήνυμα χρειάζεται για να δουλέψει το σύστημα. Αλλάζεις μόνο το κείμενο· το κουμπί και ο κωδικός μπαίνουν πάντα από το σύστημα.";
export const PREVIEW_TITLE = "Προεπισκόπηση";
export const PREVIEW_NOTE = "με φανταστικές τιμές";
export const NO_ENGLISH = "Χωρίς αγγλικό: φεύγει το ελληνικό.";

export const PREFS_TAB = "Προτιμήσεις";
export const INBOX_TAB = "Εισερχόμενα";
export const PREFS_TABS_LABEL = "Ενότητες Ειδοποιήσεων";
export const PREFS_CLIENT_NOTE =
  "Τα απαραίτητα (Τιμολόγιο, Συμφωνία, νέα Έκδοση…) δεν σβήνουν. Κάθε μη απαραίτητο email έχει και σύνδεσμο διακοπής μέσα του.";
export const PREFS_TEAM_NOTE =
  "Σβήνεις οποιονδήποτε Αυτοματισμό για τον εαυτό σου· οι συνάδελφοι συνεχίζουν να τον λαμβάνουν.";
export const PREFS_EMPTY_TITLE = "Κανένας Αυτοματισμός δεν φτάνει σε σένα";
export const PREFS_EMPTY_TEXT =
  "Όταν υπάρξει κάτι που σε αφορά, θα το δεις εδώ.";
export const PREFS_SELF_NOTE = "Δεν ειδοποιείσαι για ό,τι έκανες εσύ ο ίδιος.";
export const PREFS_CONFIGURE = "Ρύθμιση Αυτοματισμών";
export const RECEIVE_LABEL = "Λαμβάνω";
export const LOCKED_TEXT = "απαραίτητο: δεν σβήνει";
export const PREF_ON = "Θα το λαμβάνεις.";
export const PREF_OFF = "Δεν θα το λαμβάνεις.";
export const PREFS_FAILED_TITLE = "Δεν φόρτωσαν οι Προτιμήσεις";
