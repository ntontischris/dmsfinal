// I2 του Χρήστη πελάτη (Χρήματα restyle): τι μένει να πληρώσει, από τις ίδιες γραμμές που δείχνει η λίστα. Καθαρή συνάρτηση.

import type { InvoiceItem } from "../invoices-view-schema";
import { matchesFilter } from "./i2-model";

export interface ClientOwed {
  owed: number;
  overdue: number;
  unpaidCount: number;
}

// Ίδιος κανόνας με το φίλτρο «Ανεξόφλητα»: όχι πιστωτικά, με υπόλοιπο > 0.
export const clientOwedOf = (rows: readonly InvoiceItem[]): ClientOwed => {
  const unpaid = rows.filter((row) => matchesFilter(row, "unpaid"));
  return {
    owed: unpaid.reduce((sum, row) => sum + row.remaining, 0),
    overdue: unpaid
      .filter((row) => row.status === "overdue")
      .reduce((sum, row) => sum + row.remaining, 0),
    unpaidCount: unpaid.length,
  };
};
