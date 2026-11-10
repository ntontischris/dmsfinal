// Ελληνικά κείμενα των Τιμολογίων (I2) και της Καταχώρησης (I3), κατά το prototype.

import type { InvoiceFilter, InvoiceKind, InvoiceStatus } from "./invoices-view-schema";

export const INVOICES_TITLE = "Τιμολόγια";
export const INVOICE_NEW_TITLE = "Καταχώρηση Τιμολογίου";

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
