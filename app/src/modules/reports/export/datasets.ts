import { AUDIT_SHEET_HEADERS, AUDIT_TITLE } from "@/modules/audit";

import type { ExportColumn } from "./columns";

// Τα σύνολα δεδομένων της M2 (Ρ7). Ποια βλέπει ο Χρήστης και πόσες γραμμές έχουν το αποφασίζει η βάση
// (export_datasets)· εδώ ζουν μόνο οι ελληνικοί τίτλοι και οι στήλες του αρχείου. Τα κλειδιά = τα κλειδιά του JSON.

export const DATASET_CODES = [
  "invoices",
  "receipts",
  "billables",
  "ledgers",
  "clients",
  "agreements",
  "expenses",
  "audit",
] as const;
export type DatasetCode = (typeof DATASET_CODES)[number];

export interface DatasetDefinition {
  code: DatasetCode;
  title: string;
  // «Μία γραμμή = …»
  row: string;
  columns: readonly ExportColumn[];
}

const text = (key: string, header: string): ExportColumn => ({ key, header, type: "text" });
const money = (key: string, header: string): ExportColumn => ({ key, header, type: "money" });
const date = (key: string, header: string): ExportColumn => ({ key, header, type: "date" });

export const INVOICE_COLUMNS: readonly ExportColumn[] = [
  text("number", "Αριθμός"),
  text("kind", "Είδος"),
  text("clientName", "Πελάτης"),
  text("clientAfm", "ΑΦΜ"),
  date("issueDate", "Έκδοση"),
  date("dueDate", "Λήξη"),
  money("net", "Καθαρό"),
  money("vat", "ΦΠΑ"),
  money("total", "Σύνολο"),
  money("remaining", "Υπόλοιπο"),
  text("status", "Κατάσταση"),
  text("creditFor", "Πιστωτικό για"),
  text("mark", "ΜΑΡΚ"),
];

export const RECEIPT_COLUMNS: readonly ExportColumn[] = [
  date("receivedOn", "Ημερομηνία"),
  text("clientName", "Πελάτης"),
  text("clientAfm", "ΑΦΜ"),
  money("amount", "Ποσό"),
  text("method", "Τρόπος"),
  text("note", "Σημείωση"),
];

export const DATASETS: readonly DatasetDefinition[] = [
  {
    code: "invoices",
    title: "Τιμολόγια",
    row: "ένα Τιμολόγιο, απόδειξη ή πιστωτικό (κατά ημερομηνία έκδοσης)",
    columns: INVOICE_COLUMNS,
  },
  {
    code: "receipts",
    title: "Εισπράξεις",
    row: "μία Είσπραξη (κατά ημερομηνία είσπραξης)",
    columns: RECEIPT_COLUMNS,
  },
  {
    code: "billables",
    title: "Τιμολογητέα",
    row: "ένα Τιμολογητέο, με την κάλυψή του από Τιμολόγια",
    columns: [
      date("billableOn", "Ημερομηνία"),
      text("clientName", "Πελάτης"),
      text("agreementTitle", "Συμφωνία"),
      text("reason", "Λόγος"),
      text("label", "Περιγραφή"),
      money("net", "Καθαρό"),
      money("covered", "Καλύφθηκε"),
      money("open", "Προς τιμολόγηση"),
      text("state", "Κατάσταση"),
    ],
  },
  {
    code: "ledgers",
    title: "Καρτέλες Πελατών",
    row: "μία κίνηση Καρτέλας, με το υπόλοιπο μετά από αυτήν",
    columns: [
      text("clientName", "Πελάτης"),
      text("clientAfm", "ΑΦΜ"),
      date("date", "Ημερομηνία"),
      text("label", "Κίνηση"),
      money("debit", "Χρέωση"),
      money("credit", "Πίστωση"),
      money("balance", "Υπόλοιπο"),
    ],
  },
  {
    code: "clients",
    title: "Πελάτες",
    row: "ένας Πελάτης",
    columns: [
      text("name", "Όνομα"),
      text("legalName", "Επωνυμία"),
      text("afm", "ΑΦΜ"),
      text("city", "Πόλη"),
      text("contactName", "Επαφή"),
      text("contactEmail", "Email"),
      text("contactPhone", "Τηλέφωνο"),
      text("managerName", "Υπεύθυνος"),
      text("status", "Κατάσταση"),
      date("createdOn", "Από"),
    ],
  },
  {
    code: "agreements",
    title: "Συμφωνίες",
    row: "μία Συμφωνία",
    columns: [
      text("clientName", "Πελάτης"),
      text("title", "Τίτλος"),
      text("kind", "Είδος"),
      text("state", "Κατάσταση"),
      { key: "revision", header: "Αναθεώρηση", type: "integer" },
      text("signatory", "Υπογράφων"),
      date("signedOn", "Υπογραφή"),
      date("startOn", "Έναρξη"),
      date("endOn", "Λήξη"),
      date("validUntil", "Ισχύς πρότασης"),
      money("monthlyPrice", "Μηνιαία τιμή"),
      money("oneOffPrice", "Εφάπαξ τιμή"),
    ],
  },
  {
    code: "expenses",
    title: "Έξοδα ανά μήνα",
    row: "ένας μήνας Κόστους (Έξοδα, παραγωγικές ώρες, κόστος ώρας)",
    columns: [
      { key: "month", header: "Μήνας", type: "month" },
      money("expenses", "Έξοδα"),
      { key: "productiveHours", header: "Παραγωγικές ώρες", type: "number" },
      money("hourCost", "Κόστος ώρας"),
    ],
  },
  {
    // Υ5 (#214): το φύλλο το φτιάχνει το module του Ίχνους· οι στήλες εδώ μόνο για την προεπισκόπηση.
    code: "audit",
    title: AUDIT_TITLE,
    row: "μία ενέργεια (ποιος, πότε, τι, πριν → μετά), με κρυφά ποσά και κόστος όπου δεν τα βλέπεις",
    columns: AUDIT_SHEET_HEADERS.map((header) => text(header, header)),
  },
];

export const isDatasetCode = (value: string): value is DatasetCode =>
  DATASET_CODES.some((code) => code === value);

export const findDataset = (code: string | undefined): DatasetDefinition | undefined =>
  DATASETS.find((dataset) => dataset.code === code);
