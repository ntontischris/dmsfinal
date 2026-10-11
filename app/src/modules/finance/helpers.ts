import { formatReceiptDate, formatReceiptMoney } from "./money";
import type { ReceiptRow } from "./types";

// Καθαρές συναρτήσεις της λίστας: η εξαγωγή CSV γίνεται στον browser από τα δεδομένα της σελίδας.

const CSV_HEADER = ["Ημερομηνία", "Πελάτης", "Ποσό", "Τρόπος", "Σημείωση", "Καταχώρησε", "Κατάσταση"];

// Κελί CSV: εισαγωγικά όταν χρειάζεται, και προστασία από τύπους (=, +, -, @, tab, CR) στο Excel (OWASP).
export const csvCell = (value: string): string => {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",;\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

const rowCells = (row: ReceiptRow): string[] => [
  formatReceiptDate(row.receivedOn),
  row.clientName,
  formatReceiptMoney(row.amount),
  row.methodLabel,
  row.note,
  row.createdByName,
  row.deleted ? `Διαγράφηκε: ${row.deleteReason ?? ""}` : "Ενεργή",
];

// Το BOM κάνει το Excel να διαβάζει σωστά τα ελληνικά.
export const receiptsToCsv = (rows: readonly ReceiptRow[]): string => {
  const lines = [CSV_HEADER, ...rows.map(rowCells)].map((cells) => cells.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}`;
};
