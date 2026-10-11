import type { Tone } from "@/components/ui/badge";

import { csvCell } from "./helpers";
import { INVOICE_COLUMNS, KIND_LABELS, STATUS_LABELS } from "./invoices-labels";
import {
  INVOICE_FILTERS,
  type InvoiceFilter,
  type InvoiceItem,
  type InvoiceStatus,
} from "./invoices-view-schema";
import { formatReceiptDate, formatReceiptMoney } from "./money";

// Καθαρές συναρτήσεις της λίστας Τιμολογίων (I2): φίλτρο από τη διεύθυνση, χρώμα κατάστασης και εξαγωγή CSV.

export const INVOICES_PATH = "/app/finance/invoices";
export const INVOICE_NEW_PATH = "/app/finance/invoices/new";

export const parseInvoiceFilter = (value: string | undefined): InvoiceFilter =>
  INVOICE_FILTERS.find((filter) => filter === value) ?? "all";

export const filterHref = (filter: InvoiceFilter): string =>
  filter === "all" ? INVOICES_PATH : `${INVOICES_PATH}?filter=${filter}`;

export const newInvoiceHref = (clientId?: string): string =>
  clientId
    ? `${INVOICE_NEW_PATH}?client=${encodeURIComponent(clientId)}`
    : INVOICE_NEW_PATH;

export const pdfHref = (invoiceId: string): string =>
  `${INVOICES_PATH}/${invoiceId}/pdf`;

export const statusTone = (status: InvoiceStatus): Tone | undefined => {
  if (status === "paid") return "ok";
  if (status === "overdue") return "attention";
  if (status === "credit") return undefined;
  return "strong";
};

const CSV_HEADER = [
  INVOICE_COLUMNS.number,
  INVOICE_COLUMNS.kind,
  INVOICE_COLUMNS.client,
  INVOICE_COLUMNS.issued,
  INVOICE_COLUMNS.due,
  INVOICE_COLUMNS.total,
  INVOICE_COLUMNS.paid,
  INVOICE_COLUMNS.remaining,
  INVOICE_COLUMNS.status,
];

const rowCells = (row: InvoiceItem): string[] => [
  row.number,
  KIND_LABELS[row.kind],
  row.clientName,
  formatReceiptDate(row.issueDate),
  row.dueDate ? formatReceiptDate(row.dueDate) : "",
  formatReceiptMoney(row.total),
  formatReceiptMoney(row.paid),
  formatReceiptMoney(row.remaining),
  STATUS_LABELS[row.status],
];

// Το BOM κάνει το Excel να διαβάζει σωστά τα ελληνικά.
export const invoicesToCsv = (rows: readonly InvoiceItem[]): string => {
  const lines = [CSV_HEADER, ...rows.map(rowCells)].map((cells) =>
    cells.map(csvCell).join(";"),
  );
  return `﻿${lines.join("\r\n")}`;
};
