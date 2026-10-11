// Ελληνικά κείμενα της Διόρθωσης, της Ακύρωσης και του Ίχνους (I3 με ?invoice=, I2), κατά το prototype.

import type { ChangeField, TrailAction } from "./invoice-detail-schema";

export const INVOICE_DETAIL_ERROR = "Δεν φόρτωσε η καταχώριση";
export const INVOICE_CORRECT_LINK = "Διόρθωση";
export const INVOICE_CORRECT_TITLE = "Διόρθωση ή ακύρωση καταχώρισης";
export const INVOICE_CORRECT_HEADING = "Διόρθωση στοιχείων";
export const INVOICE_CORRECT_NOTE =
  "Η διόρθωση και η ακύρωση δεν στέλνουν email. Λάθος μέσα στο ίδιο το τιμολόγιο διορθώνεται με πιστωτικό, όχι με ακύρωση.";
export const INVOICE_CORRECT_SUBMIT = "Αποθήκευση διόρθωσης";
export const INVOICE_CORRECT_REASON = "Λόγος διόρθωσης (προαιρετικός)";
export const INVOICE_VOID_TITLE = "Ακύρωση καταχώρισης";
export const INVOICE_VOID_NOTE =
  "Φεύγει από την Καρτέλα και τα σύνολα. Ο πελάτης δεν τη βλέπει· η ομάδα τη βλέπει ως «ακυρώθηκε» με τον λόγο.";
export const INVOICE_VOID_REASON = "Λόγος ακύρωσης (υποχρεωτικός)";
export const INVOICE_VOID_PLACEHOLDER = "π.χ. ανέβηκε δύο φορές, λάθος Πελάτης";
export const INVOICE_VOID_OPEN = "Ακύρωση καταχώρισης";
export const INVOICE_VOID_CONFIRM = "Επιβεβαίωση ακύρωσης";
export const INVOICE_VOID_BODY =
  "Ακυρώνεται η καταχώριση. Η ενέργεια γράφεται στο Ίχνος και δεν αναιρείται.";
export const INVOICE_VOIDED_TEXT = "Η καταχώριση είναι ακυρωμένη";
export const INVOICE_BACK = "Πίσω στα Τιμολόγια";

export const TRAIL_TITLE = "Ίχνος καταχώρισης";
export const TRAIL_EMPTY =
  "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών».";

export const VOIDED_TITLE = "Ακυρωμένες καταχωρίσεις";
export const VOIDED_NOTE =
  "Λάθος στο DMS (π.χ. ανέβηκε δύο φορές). Δεν μετρούν σε Καρτέλα και σύνολα· ο πελάτης δεν τις βλέπει.";

export const FIELD_LABELS: Readonly<Record<ChangeField, string>> = {
  number: "Αριθμός",
  issueDate: "Ημερομηνία έκδοσης",
  dueDate: "Λήξη",
  net: "Καθαρό (€)",
  vat: "ΦΠΑ (€)",
  total: "Σύνολο (€)",
  mark: "ΜΑΡΚ",
};

export const TRAIL_ACTION_LABELS: Readonly<Record<TrailAction, string>> = {
  registered: "Καταχωρήθηκε",
  corrected: "Διόρθωση",
  voided: "Ακυρώθηκε",
};
