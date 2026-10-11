// Ελληνικά κείμενα των Τιμολογίων (I2) και της Καταχώρησης (I3), κατά το prototype.

import type { InvoiceFilter, InvoiceKind, InvoiceStatus } from "./invoices-view-schema";

export const INVOICES_TITLE = "Τιμολόγια";
export const INVOICES_EYEBROW = "I2 · Οικονομικά";
export const INVOICE_NEW_TITLE = "Καταχώρηση Τιμολογίου";
export const INVOICE_NEW_EYEBROW = "I3 · Οικονομικά";
export const INVOICES_NO_ACCESS_TEXT = "Τα Τιμολόγια τα βλέπουν μόνο όσοι βλέπουν Οικονομικά και ποσά.";
export const INVOICE_NEW_NO_ACCESS_TEXT = "Μόνο όποιος καταχωρεί Τιμολόγια.";
export const INVOICES_ERROR_TITLE = "Δεν φόρτωσαν τα Τιμολόγια";
export const INVOICES_ERROR_TEXT = "Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.";
export const INVOICES_EMPTY_TITLE = "Κανένα Τιμολόγιο";
export const INVOICES_EMPTY_TEXT = "Δεν υπάρχει Τιμολόγιο για αυτό το φίλτρο.";
export const INVOICES_CTA = "Καταχώρηση Τιμολογίου";
export const INVOICES_CSV = "Εξαγωγή CSV";
export const INVOICES_FILTER_LABEL = "Φίλτρο Τιμολογίων";
export const INVOICE_PDF_LABEL = "PDF";

export const INVOICE_NEW_PICK_TEXT = "Διάλεξε τον Πελάτη του Τιμολογίου για να συνεχίσεις.";
export const INVOICE_NEW_CONTEXT_ERROR = "Δεν φόρτωσαν τα στοιχεία του Πελάτη";
export const INVOICE_EMAIL_NOTE =
  "Η καταχώριση στέλνει email με το PDF σε όλους τους Χρήστες του Πελάτη με «Βλέπει Οικονομικά». Δεν παραλείπεται.";
export const INVOICE_SUBMIT = "Επιβεβαίωση και καταχώρηση";
export const INVOICE_TAX_CONFIRM = "Το επιβεβαίωσα: το ΑΦΜ του PDF είναι σωστό παρά τη διαφορά.";

export const FILTER_LABELS: Readonly<Record<InvoiceFilter, string>> = {
  all: "όλα",
  unpaid: "ανεξόφλητα",
  overdue: "ληξιπρόθεσμα",
  credit: "πιστωτικά",
};

export const KIND_LABELS: Readonly<Record<InvoiceKind, string>> = {
  invoice: "τιμολόγιο",
  receipt: "απόδειξη",
  credit: "πιστωτικό",
};

export const STATUS_LABELS: Readonly<Record<InvoiceStatus, string>> = {
  unpaid: "ανεξόφλητο",
  partial: "μερικώς εξοφλημένο",
  overdue: "ληξιπρόθεσμο",
  paid: "εξοφλημένο",
  credit: "πιστωτικό",
};

export const INVOICE_COLUMNS = {
  number: "Αριθμός",
  kind: "Είδος",
  client: "Πελάτης",
  issued: "Έκδοση",
  due: "Λήξη",
  total: "Σύνολο",
  paid: "Εξοφλήθηκε",
  remaining: "Υπόλοιπο",
  status: "Κατάσταση",
  actions: "Ενέργειες",
} as const;
