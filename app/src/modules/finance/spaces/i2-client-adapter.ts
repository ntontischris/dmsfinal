import type { InvoiceItem } from "../invoices-view-schema";
import type { ClientInvoice } from "../ledger-view-schema";

// I2 του Χρήστη πελάτη (νέα εμφάνιση): οι γραμμές του client_invoices_view στο σχήμα της λίστας της ομάδας,
// ώστε να ισχύουν τα ίδια φίλτρα και ο ίδιος πίνακας. Ο πελάτης δεν έχει στήλη Πελάτη, άρα τα πεδία του μένουν κενά.
export const clientInvoiceRowOf = (row: ClientInvoice): InvoiceItem => ({
  ...row,
  clientId: "",
  clientName: "",
});
