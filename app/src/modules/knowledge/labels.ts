import type { ItemKind, ItemStatus, TextStatus } from "./view-schema";

// Ελληνικά κείμενα της Γνώσης (A8, L1), κατά το prototype.

export const LIBRARY_EYEBROW = "A8 · Γνώση";
export const LIBRARY_TITLE = "Γνώση";
export const MANAGE_EYEBROW = "L1 · Διαχείριση Γνώσης";
export const MANAGE_TITLE = "Διαχείριση Γνώσης";

export const LOAD_ERROR_TITLE = "Η Γνώση δεν φόρτωσε";
export const LOAD_ERROR_TEXT = "Δεν χάθηκε τίποτα. Ανανέωσε τη σελίδα σε λίγο.";
export const NOT_IN_AUDIENCE_TEXT =
  "Αυτό το στοιχείο δεν ανήκει στο Κοινό σου.";
export const NO_MANAGE_TEXT =
  "Τη Γνώση τη διαχειρίζεται όποιος έχει «Διαχειρίζεται Γνώση» (στους έτοιμους Ρόλους: Ιδιοκτήτης και Διαχείριση).";
export const NO_ACCOUNT_TEXT =
  "Η Γνώση είναι για όσους έχουν λογαριασμό. Συνδέσου για να τη δεις.";
export const EMPTY_LIBRARY_TITLE = "Δεν υπάρχει ακόμα Γνώση για σένα";
export const EMPTY_KNOWLEDGE_TITLE =
  "Η Γνώση είναι άδεια. Ξεκίνα με μια Ενότητα και ένα Άρθρο.";
export const SEARCH_LABEL = "Αναζήτηση στη Γνώση";
export const PRICES_NOTE = "Για τιμές, δες τον Κατάλογο.";
export const CLIENT_HELP_NOTE =
  "Δεν βρίσκεις κάτι; Γράψε στη Συνομιλία με την ομάδα.";
export const CONTENT_RULE_NOTE =
  "Η Γνώση γράφεται μία φορά στα ελληνικά και δεν γράφει τιμές· όπου χρειάζεται τιμή, «δείτε τον Κατάλογο».";
export const MEMORY_NOTE =
  "Ο Βοηθός μαθαίνει μόνος του κάθε δημοσίευση και αλλαγή μέσα σε ένα λεπτό. Ξαναφτιάξε τη μνήμη του μόνο αν κάτι δεν βρίσκεται.";
export const ASSISTANT_LIMITS_NOTE =
  "Όρια του Βοηθού: στις Ρυθμίσεις → Εταιρεία → Βοηθός";

export const KIND_LABEL: Readonly<Record<ItemKind, string>> = {
  article: "Άρθρο",
  file: "Αρχείο",
};
export const STATUS_LABEL: Readonly<Record<ItemStatus, string>> = {
  draft: "πρόχειρο",
  published: "δημοσιευμένο",
};

// Τι διαβάζει ο Βοηθός από ένα Αρχείο (το text_status το γεμίζει η μνήμη του Βοηθού).
export const TEXT_STATUS_LABEL: Readonly<Record<TextStatus, string>> = {
  pending: "Ο Βοηθός θα διαβάσει το κείμενο του Αρχείου σε λίγο.",
  ok: "Ο Βοηθός διαβάζει όλο το κείμενο.",
  image_only:
    "Είναι εικόνα· ο Βοηθός διαβάζει μόνο την Περίληψη. Γράψε την πιο πλήρη.",
  failed:
    "Ο Βοηθός δεν μπόρεσε να διαβάσει το Αρχείο· διαβάζει μόνο την Περίληψη.",
};

export const PUBLIC_AUDIENCE_LABEL =
  "δημόσιο (και Επισκέπτες, μέσω του Βοηθού)";
export const ROLE_KIND_LABEL = {
  team: "Ρόλοι ομάδας",
  client: "Ρόλοι πελάτη",
} as const;
