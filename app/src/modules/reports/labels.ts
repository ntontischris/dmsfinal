// Ελληνικά κείμενα του module «Αναφορές» (M1), όπως στο prototype.

export const REPORTS_TITLE = "Αναφορές";
export const REPORTS_EYEBROW = "M1 · Αναφορές";
export const REPORTS_BACK = "← Όλες οι Αναφορές";

export const FAMILY_TITLES = {
  finance: "Οικονομικές",
  sales: "Πωλήσεις",
} as const;

export const NO_ACCESS_TEXT =
  "Τις Αναφορές τις βλέπουν όσοι έχουν «Βλέπει Αναφορές».";
export const REPORT_NO_ACCESS_TEXT =
  "Αυτή η Αναφορά διαβάζει δεδομένα που δεν βλέπεις.";
export const NONE_VISIBLE_TITLE = "Καμία Αναφορά για σένα ακόμα";
export const NONE_VISIBLE_TEXT =
  "Οι Αναφορές φαίνονται μόνο σε όποιον βλέπει την πηγή τους: οι οικονομικές με «Βλέπει Οικονομικά».";
export const UNKNOWN_REPORT_TITLE = "Η Αναφορά δεν βρέθηκε";
export const UNKNOWN_REPORT_TEXT =
  "Ο σύνδεσμος δεν αντιστοιχεί σε καμία Αναφορά. Διάλεξε μία από τη λίστα.";

export const LOAD_ERROR_TITLE = (title: string): string =>
  `Δεν φόρτωσε η Αναφορά «${title}»`;
export const LOAD_ERROR_TEXT = "Δεν χάθηκε τίποτα. Ξαναδοκίμασε σε λίγο.";
export const RETRY_LABEL = "Ξαναδοκίμασε";

export const BASIS_LABEL = "Πώς μετράει";
export const PERIOD_LABEL = "Περίοδος";
export const CLIENT_LABEL = "Πελάτης";
export const CLIENT_ALL = "Όλοι";
export const CLIENT_APPLY = "Αλλαγή";
export const PARTIAL_BADGE = "ως σήμερα";
export const TOTAL_LABEL = "Σύνολο";
export const NO_AMOUNTS_NOTE =
  "Βλέπεις πλήθη χωρίς ποσά: τα ποσά θέλουν «Βλέπει ποσά».";
export const ONLY_FOR = (name: string): string => `Μόνο για: ${name}`;

export const PROFITABILITY_NOTE =
  "Κερδοφορία ανά Παραγωγή, Πελάτη και μήνα: ζει στα Οικονομικά, οι Αναφορές δεν την ξαναφτιάχνουν.";
export const PROFITABILITY_LINK = "Κόστος και ώρες";
