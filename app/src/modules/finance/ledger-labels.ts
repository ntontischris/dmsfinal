// Ελληνικά κείμενα της Καρτέλας Πελάτη (I5), κατά το prototype.

export const LEDGER_TITLE = "Καρτέλα Πελάτη";
export const LEDGER_EYEBROW = "I5 · Οικονομικά";
export const LEDGER_NO_ACCESS_TEXT =
  "Η Καρτέλα Πελάτη είναι για όσους βλέπουν Οικονομικά και ποσά, και για τους Χρήστες του Πελάτη με «Βλέπει Οικονομικά».";
export const LEDGER_ERROR_TITLE = "Δεν φορτώθηκε η Καρτέλα Πελάτη";
export const LEDGER_ERROR_TEXT = "Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.";
export const LEDGER_EMPTY_TITLE = "Καμία κίνηση";
export const LEDGER_EMPTY_TEXT =
  "Δεν υπάρχουν Τιμολόγια ή Εισπράξεις για αυτόν τον Πελάτη.";
export const LEDGER_CLIENTS_EMPTY_TITLE = "Καμία κίνηση σε κανέναν Πελάτη";
export const LEDGER_CLIENTS_EMPTY_TEXT =
  "Οι Πελάτες εμφανίζονται εδώ μόλις αποκτήσουν Τιμολόγιο ή Είσπραξη.";
export const LEDGER_PICK_TEXT = "Διάλεξε Πελάτη για να δεις την Καρτέλα του.";
export const LEDGER_CLIENTS_LABEL = "Πελάτες με κινήσεις";
export const LEDGER_BACK = "← Όλοι οι Πελάτες";
export const LEDGER_NOTE =
  "Μόνο το Τιμολόγιο δημιουργεί οφειλή. Αρνητικό υπόλοιπο σημαίνει υπόλοιπο υπέρ του πελάτη (π.χ. προκαταβολή), που συμψηφίζεται με το επόμενο Τιμολόγιο.";

export const PAYMENT_TITLE = "Στοιχεία πληρωμής";
export const PAYMENT_HOLDER = "Δικαιούχος";
export const PAYMENT_BANK = "Τράπεζα";
export const PAYMENT_IBAN = "IBAN";

export const TO_INVOICE_TITLE = "Προς τιμολόγηση";
export const TO_INVOICE_LINK = "Άνοιγμα I1";
export const TO_INVOICE_NOTE =
  "Ο πελάτης δεν το βλέπει. Δεν είναι οφειλή· μόνο το Τιμολόγιο δημιουργεί οφειλή.";

export const OVERDUE_LABEL = "Ληξιπρόθεσμο";
export const OVERDUE_BADGE = "ληξιπρόθεσμο";

export const LEDGER_COLUMNS = {
  date: "Ημερομηνία",
  entry: "Κίνηση",
  debit: "Χρέωση",
  credit: "Πίστωση",
  running: "Υπόλοιπο",
} as const;

export const CLIENT_INVOICES_EYEBROW = "I2 · Οικονομικά";
export const CLIENT_INVOICES_EMPTY_TITLE = "Κανένα Τιμολόγιο";
export const CLIENT_INVOICES_EMPTY_TEXT =
  "Δεν έχει καταχωρηθεί ακόμα Τιμολόγιο για σένα.";
export const CLIENT_INVOICES_NO_ACCESS_TEXT =
  "Τα Τιμολόγια τα βλέπουν οι Χρήστες του Πελάτη με «Βλέπει Οικονομικά».";
