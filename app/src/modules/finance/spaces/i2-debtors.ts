import { csvCell } from "../helpers";
import type { InvoiceItem } from "../invoices-view-schema";
import { formatReceiptDate, formatReceiptMoney } from "../money";

// Τ5 «Ποιος μας χρωστάει»: τα ληξιπρόθεσμα ανά Πελάτη. Τ7: αναζήτηση σε αριθμό Τιμολογίου και όνομα Πελάτη.

export interface Debtor {
  clientId: string;
  clientName: string;
  // Ληξιπρόθεσμο υπόλοιπο με ΦΠΑ.
  amount: number;
  oldestDue: string;
  count: number;
  // Το παλαιότερο ληξιπρόθεσμο (για υπενθύμιση με ένα κλικ).
  invoiceId: string;
}

const r2 = (value: number): number => Math.round(value * 100) / 100;

const addRow = (debtor: Debtor | undefined, row: InvoiceItem): Debtor => {
  const due = row.dueDate ?? row.issueDate;
  if (!debtor)
    return {
      clientId: row.clientId,
      clientName: row.clientName,
      amount: row.remaining,
      oldestDue: due,
      count: 1,
      invoiceId: row.id,
    };
  const isOlder = due < debtor.oldestDue;
  return {
    ...debtor,
    amount: r2(debtor.amount + row.remaining),
    count: debtor.count + 1,
    oldestDue: isOlder ? due : debtor.oldestDue,
    invoiceId: isOlder ? row.id : debtor.invoiceId,
  };
};

export const debtorsOf = (rows: readonly InvoiceItem[]): Debtor[] =>
  [
    ...rows
      .filter((row) => row.status === "overdue" && row.remaining > 0)
      .reduce(
        (byId, row) => byId.set(row.clientId, addRow(byId.get(row.clientId), row)),
        new Map<string, Debtor>(),
      )
      .values(),
  ].sort((a, b) => b.amount - a.amount);

const DEBTORS_CSV_HEADER = ["Πελάτης", "Ληξιπρόθεσμα Τιμολόγια", "Χρωστάει (με ΦΠΑ)", "Παλαιότερη λήξη"];

// Η εξαγωγή του «Ποιος μας χρωστάει»: οι γραμμές ανά Πελάτη που φαίνονται. Το BOM για τα ελληνικά στο Excel.
export const debtorsToCsv = (debtors: readonly Debtor[]): string => {
  const lines = [
    DEBTORS_CSV_HEADER,
    ...debtors.map((debtor) => [
      debtor.clientName,
      String(debtor.count),
      formatReceiptMoney(debtor.amount),
      formatReceiptDate(debtor.oldestDue),
    ]),
  ].map((cells) => cells.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}`;
};

// Πεζά, χωρίς τόνους: «Ηλιάδη» = «ηλιαδη».
const plain = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("el");

export const matchesSearch = (row: InvoiceItem, search: string): boolean => {
  const needle = plain(search.trim());
  if (needle === "") return true;
  return plain(row.number).includes(needle) || plain(row.clientName).includes(needle);
};
