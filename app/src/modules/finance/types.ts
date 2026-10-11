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
  methodId: string;
  methodLabel: string;
  note: string;
  createdByName: string;
  deleted: boolean;
  deleteReason: string | null;
  canEdit: boolean;
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
}

export interface ClientOption {
  id: string;
  name: string;
}
