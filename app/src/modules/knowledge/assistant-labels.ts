import type { DoneCode } from "./assistant-helpers";

// Ελληνικά κείμενα των Συζητήσεων (L2) και των Αναπάντητων (L3), κατά το prototype.

export const CONVERSATIONS_EYEBROW = "L2 · Συζητήσεις Βοηθού";
export const CONVERSATIONS_TITLE = "Συζητήσεις Βοηθού";
export const UNANSWERED_EYEBROW = "L3 · Αναπάντητες ερωτήσεις";
export const UNANSWERED_TITLE = "Αναπάντητες ερωτήσεις";

export const NO_CONVERSATIONS_ACCESS_TEXT =
  "Τις Συζητήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.";
export const NO_UNANSWERED_ACCESS_TEXT =
  "Τις Αναπάντητες ερωτήσεις τις βλέπει όποιος διαχειρίζεται τη Γνώση.";
export const CONVERSATIONS_LOAD_ERROR = "Οι Συζητήσεις του Βοηθού δεν φόρτωσαν";
export const UNANSWERED_LOAD_ERROR = "Οι Αναπάντητες ερωτήσεις δεν φόρτωσαν";
export const CONVERSATION_GONE_TEXT =
  "Η Συζήτηση δεν υπάρχει πια (διαγράφηκε ή πέρασαν 12 μήνες).";

export const EMPTY_CONVERSATIONS_TITLE = "Καμία Συζήτηση ακόμα";
export const EMPTY_CONVERSATIONS_TEXT =
  "Όταν κάποιος ρωτήσει τον Βοηθό, η Συζήτηση θα εμφανιστεί εδώ.";
export const EMPTY_OPEN_TITLE = "Καμία ανοιχτή ερώτηση";
export const EMPTY_OPEN_TEXT =
  "Καμία ανοιχτή ερώτηση. Ο Βοηθός βρήκε πηγή για όλα.";
export const EMPTY_CLOSED_TITLE = "Καμία ερώτηση εδώ";
export const EMPTY_CLOSED_TEXT = "Δεν υπάρχει τίποτα σε αυτή την καρτέλα.";

export const UNANSWERED_INTRO =
  "Ίδιες ερωτήσεις μαζεύονται σε μία γραμμή. Η λίστα δεν αδειάζει μόνη της: κάθε ερώτηση κλείνει με «Καλύφθηκε» ή «Αγνόησε».";
export const UNANSWERED_FOOTNOTE =
  "Κρατιούνται όσο η Συζήτησή τους: σβήνουν 12 μήνες μετά το τελευταίο μήνυμα. Καμία Ειδοποίηση· ο αριθμός των ανοιχτών φαίνεται στη Διαχείριση Γνώσης.";
export const REASK_NOTE =
  "Αν ξαναρωτηθεί και ο Βοηθός πάλι δεν βρει πηγή, μπαίνει ως νέα ανοιχτή.";
export const PUBLIC_NOTE =
  "Για να το βρει ο Επισκέπτης, το στοιχείο πρέπει να έχει Κοινό «δημόσιο».";
export const PERSONAL_DATA_NOTE =
  "Προσωπικά δεδομένα: π.χ. «πόσο χρωστάω;»: ο Βοηθός δεν βλέπει δεδομένα χρήστη στο v1· ίσως αξίζει Άρθρο που δείχνει πού το βλέπει ο ίδιος.";
export const DELETE_NOTE =
  "Για αίτημα διαγραφής· αλλιώς σβήνει μόνη της 12 μήνες μετά το τελευταίο μήνυμα, μαζί με τις Αναπάντητές της.";
export const READ_ONLY_NOTE = "Μόνο ανάγνωση: από εδώ δεν απαντάς στον χρήστη.";

export const DONE_TEXT: Readonly<Record<DoneCode, string>> = {
  covered: "Η ερώτηση κλείστηκε: καλύφθηκε.",
  covered_not_public:
    "Η ερώτηση κλείστηκε: καλύφθηκε. Προσοχή: ήρθε από Επισκέπτη και το στοιχείο δεν έχει Κοινό «δημόσιο», άρα ο Βοηθός της Ιστοσελίδας δεν θα το βρει.",
  ignored: "Η ερώτηση κλείστηκε: αγνοήθηκε.",
  reopened: "Η ερώτηση ξανάνοιξε.",
  deleted: "Η Συζήτηση διαγράφηκε, μαζί με τις Αναπάντητές της.",
};
