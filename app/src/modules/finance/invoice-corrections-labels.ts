// Ελληνικά κείμενα της Διόρθωσης, της Ακύρωσης και του Ίχνους (I3 με ?invoice=, I2), κατά το prototype.

import type { ChangeField, TrailAction } from "./invoice-detail-schema";

export const INVOICE_VOID_BODY =
  "Ακυρώνεται η καταχώριση. Η ενέργεια γράφεται στο Ίχνος και δεν αναιρείται.";

export const TRAIL_EMPTY =
  "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών».";

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
