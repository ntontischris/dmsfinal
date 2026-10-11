import { z } from "zod";

import { INVOICE_KINDS } from "./invoices-view-schema";
import { parseReceiptAmount } from "./money";

// Έλεγχος της φόρμας Καταχώρησης στο όριο του server. Η βάση ελέγχει ξανά (P0001)· εδώ πιάνουμε πρώτα τα προφανή.

export const PDF_MAX_BYTES = 10 * 1024 * 1024;

const MAX_AMOUNT = 9_999_999.99;
const AMOUNT_MESSAGE = "Γράψε ποσό σε ευρώ, π.χ. 1300 ή 1300,50.";
const TOTAL_MESSAGE = "Γράψε το σύνολο σε ευρώ (μεγαλύτερο από 0).";
const DATE_MESSAGE = "Γράψε ημερομηνία.";
const CLIENT_MESSAGE = "Διάλεξε Πελάτη.";
const KIND_MESSAGE = "Διάλεξε είδος: τιμολόγιο, απόδειξη ή πιστωτικό.";
const NUMBER_MESSAGE = "Γράψε αριθμό από 1 έως 40 χαρακτήρες.";
const MARK_MESSAGE = "Ο ΜΑΡΚ έχει μόνο ψηφία (έως 20).";
const CREDIT_MESSAGE = "Διάλεξε το Τιμολόγιο που διορθώνει το πιστωτικό.";

export const PDF_FILE_MESSAGE = "Ανέβασε το PDF του Τιμολογίου (έως 10 MB).";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const moneyField = (message: string, min: number) =>
  z.string().transform((value, ctx) => {
    const amount = parseReceiptAmount(value);
    if (amount === undefined || amount < min || amount > MAX_AMOUNT) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return amount;
  });

const emptyAsNull = (value: string): string | null =>
  value.trim() === "" ? null : value.trim();

const optionalDay = z.string().transform((value, ctx) => {
  const day = emptyAsNull(value);
  if (day !== null && !DAY.test(day)) {
    ctx.addIssue({ code: "custom", message: DATE_MESSAGE });
    return z.NEVER;
  }
  return day;
});

export const invoiceFormSchema = z
  .object({
    clientId: z.uuid(CLIENT_MESSAGE),
    kind: z.enum(INVOICE_KINDS, KIND_MESSAGE),
    number: z.string().trim().min(1, NUMBER_MESSAGE).max(40, NUMBER_MESSAGE),
    issueDate: z.string().regex(DAY, DATE_MESSAGE),
    dueDate: optionalDay,
    net: moneyField(AMOUNT_MESSAGE, 0),
    vat: moneyField(AMOUNT_MESSAGE, 0),
    total: moneyField(TOTAL_MESSAGE, 0.01),
    mark: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{1,20}$/.test(value), MARK_MESSAGE)
      .transform(emptyAsNull),
    pdfTaxId: z.string().transform(emptyAsNull),
    creditFor: z
      .string()
      .refine(
        (value) => value === "" || z.uuid().safeParse(value).success,
        CREDIT_MESSAGE,
      )
      .transform(emptyAsNull),
    taxIdConfirmed: z
      .string()
      .transform((value) => value === "on" || value === "true"),
  })
  .refine((form) => form.kind !== "credit" || form.creditFor !== null, {
    message: CREDIT_MESSAGE,
    path: ["creditFor"],
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const invoiceFormKeys = [
  "clientId",
  "kind",
  "number",
  "issueDate",
  "dueDate",
  "net",
  "vat",
  "total",
  "mark",
  "pdfTaxId",
  "creditFor",
  "taxIdConfirmed",
] as const;

// Το αρχείο της φόρμας: PDF, όχι κενό, έως 10 MB. Επιστρέφει μήνυμα λάθους ή null.
export const pdfFileProblem = (file: unknown): string | null => {
  if (!(file instanceof File) || file.size === 0 || file.size > PDF_MAX_BYTES)
    return PDF_FILE_MESSAGE;
  return file.type === "application/pdf" ? null : PDF_FILE_MESSAGE;
};

// Τα πρώτα bytes ενός PDF είναι «%PDF-».
export const hasPdfHeader = (bytes: Uint8Array): boolean =>
  bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
