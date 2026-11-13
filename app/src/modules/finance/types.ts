// Τύποι του module Εισπράξεων (I4, #150). Ό,τι έρχεται από τη βάση περνά από τα σχήματα του view-schema.ts πρώτα.

export interface PaymentMethod {
  id: string;
  label: string;
  retired: boolean;
}

export interface ReceiptRow {
  id: string;
  clientId: string;
  clientName: string;
  receivedOn: string;
  amount: number;
  // Η παρακράτηση φόρου (d6): κλείνει το Τιμολόγιο όπως η πληρωμή, αλλά δεν είναι μετρητά.
  withheld: number;
  withholdingId: string | null;
  withholdingLabel: string | null;
  // Τα Τιμολόγια που δέθηκαν με το χέρι (d4)· κενό = από το παλαιότερο, όπως πριν.
  invoiceIds: string[];
  invoiceNumbers: string[];
  methodId: string;
  methodLabel: string;
  note: string;
  createdByName: string;
  deleted: boolean;
  deleteReason: string | null;
  canEdit: boolean;
}

// Ποσοστό παρακράτησης (d6): το αλλάζει ο admin στις Ρυθμίσεις › Οικονομικά.
export interface WithholdingRate {
  id: string;
  label: string;
  percent: number;
  retired: boolean;
}

export interface ReceiptSettle {
  invoiceId: string;
  number: string;
  amount: number;
}

// «Θα εξοφλήσει» και το υπόλοιπο υπέρ του Πελάτη. Σήμερα το surplus είναι όλο το ποσό (δεν υπάρχουν Τιμολόγια).
export interface ReceiptPreview {
  settles: ReceiptSettle[];
  surplus: number;
}

export interface FinanceCaps {
  canView: boolean;
  canRegister: boolean;
  canManageMethods: boolean;
  canRegisterInvoices: boolean;
}

export interface ClientOption {
  id: string;
  name: string;
}
