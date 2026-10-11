// Ελληνικά κείμενα του «Προς τιμολόγηση» (I1), κατά το prototype.

export const BILLABLES_TITLE = "Προς τιμολόγηση";
export const BILLABLES_EYEBROW = "I1 · Οικονομικά";
export const BILLABLES_NOTE =
  "Τα Τιμολογητέα δεν είναι οφειλή· ο πελάτης δεν τα βλέπει.";
export const BILLABLES_EMPTY_TITLE = "Δεν περιμένει τίποτα για τιμολόγηση";
export const BILLABLES_EMPTY_TEXT =
  "Όλα τα Τιμολογητέα έχουν καλυφθεί από Τιμολόγια.";
export const BILLABLES_ERROR_TITLE = "Δεν φορτώθηκε: το «Προς τιμολόγηση»";
export const BILLABLES_ERROR_TEXT = "Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.";
export const BILLABLES_NO_ACCESS_TEXT =
  "Το «Προς τιμολόγηση» το βλέπουν μόνο όσοι βλέπουν Οικονομικά και ποσά.";

export const REASON_LABELS: Readonly<Record<string, string>> = {
  period: "Περίοδος",
  milestone: "Δόση",
  extra_deliverable: "Έξτρα Παραδοτέο",
  extra_revision: "Έξτρα αναθεώρηση",
  extra_filming: "Έξτρα Γύρισμα",
  dissolution_fee: "Ρήτρα λύσης",
};

export const NO_REMINDER_TEXT = "—";

export const COLUMN_LABELS = {
  date: "Ημερομηνία",
  agreement: "Συμφωνία",
  reason: "Λόγος",
  net: "Ποσό (καθαρό)",
  days: "Μέρες ανοιχτό",
  reminders: "Υπενθύμιση",
} as const;
