import { z } from "zod";

import { parseReceiptAmount } from "./money";

// Έλεγχος των φορμών του module στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο Χρήστης.
// Η βάση ελέγχει ξανά (P0001)· εδώ πιάνουμε πρώτα τα προφανή.

const AMOUNT_MESSAGE = "Γράψε ποσό σε ευρώ, π.χ. 150 ή 150,50.";
const DATE_MESSAGE = "Γράψε ημερομηνία.";
const CLIENT_MESSAGE = "Διάλεξε Πελάτη.";
const METHOD_MESSAGE = "Διάλεξε τρόπο είσπραξης.";
const REASON_MESSAGE = "Γράψε τον λόγο (έως 500 χαρακτήρες).";
const NOTE_MESSAGE = "Η σημείωση έχει το πολύ 500 χαρακτήρες.";
const LABEL_MESSAGE = "Γράψε ονομασία τρόπου από 1 έως 60 χαρακτήρες.";
const RECEIPT_MESSAGE = "Η Είσπραξη δεν βρέθηκε.";
const WITHHELD_MESSAGE = "Γράψε την παρακράτηση σε ευρώ, π.χ. 120 ή 120,50.";
const RATE_MESSAGE = "Διάλεξε είδος παρακράτησης.";
const INVOICES_MESSAGE = "Διάλεξε έως 20 Τιμολόγια.";
const PERCENT_MESSAGE = "Γράψε ποσοστό πάνω από 0 και κάτω από 100, π.χ. 20.";
const MAX_AMOUNT = 9_999_999.99;

const amountText = z.string().transform((value, ctx) => {
  const amount = parseReceiptAmount(value);
  if (amount === undefined || amount <= 0 || amount > MAX_AMOUNT) {
    ctx.addIssue({ code: "custom", message: AMOUNT_MESSAGE });
    return z.NEVER;
  }
  return amount;
});

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE_MESSAGE);
const noteText = z.string().trim().max(500, NOTE_MESSAGE);
const reasonText = z.string().trim().min(1, REASON_MESSAGE).max(500, REASON_MESSAGE);
const clientId = z.uuid(CLIENT_MESSAGE);
const methodId = z.uuid(METHOD_MESSAGE);
const receiptId = z.uuid(RECEIPT_MESSAGE);

// Παρακράτηση (d6): κενό = 0.
const withheldText = z.string().default("").transform((value, ctx) => {
  if (value.trim() === "") return 0;
  const amount = parseReceiptAmount(value);
  if (amount === undefined || amount < 0 || amount > MAX_AMOUNT) {
    ctx.addIssue({ code: "custom", message: WITHHELD_MESSAGE });
    return z.NEVER;
  }
  return amount;
});

const optionalUuid = (message: string) =>
  z
    .string()
    .default("")
    .refine((value) => value === "" || z.uuid().safeParse(value).success, message)
    .transform((value) => (value === "" ? null : value));

// Τα δεμένα Τιμολόγια (d4) έρχονται ως λίστα με κόμματα· κενό = από το παλαιότερο.
const invoiceIdsText = z.string().default("").transform((value, ctx) => {
  const ids = value.split(",").map((id) => id.trim()).filter((id) => id !== "");
  if (ids.length > 20 || ids.some((id) => !z.uuid().safeParse(id).success)) {
    ctx.addIssue({ code: "custom", message: INVOICES_MESSAGE });
    return z.NEVER;
  }
  return ids;
});

// Κενό κουτί (νέος Τρόπος) = null· αλλιώς πρέπει να είναι UUID.
const optionalMethodId = z
  .string()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, METHOD_MESSAGE)
  .transform((value) => (value === "" ? null : value));

export const receiptFormSchema = z.object({
  clientId,
  amount: amountText,
  receivedOn: dateText,
  methodId,
  note: noteText,
  withheld: withheldText,
  withholdingId: optionalUuid(RATE_MESSAGE),
  invoiceIds: invoiceIdsText,
});

export const correctionFormSchema = receiptFormSchema.omit({ clientId: true }).extend({
  id: receiptId,
  reason: reasonText,
});

export const deleteFormSchema = z.object({
  id: receiptId,
  reason: reasonText,
});

export const previewSchema = z.object({
  clientId,
  amount: amountText,
});

export const methodFormSchema = z.object({
  id: optionalMethodId,
  label: z.string().trim().min(1, LABEL_MESSAGE).max(60, LABEL_MESSAGE),
});

export const methodIdSchema = z.object({ id: z.uuid(METHOD_MESSAGE) });

// Ποσοστό παρακράτησης (Ρυθμίσεις › Οικονομικά, d6).
export const withholdingRateFormSchema = z.object({
  id: optionalUuid(RATE_MESSAGE),
  label: z.string().trim().min(1, LABEL_MESSAGE).max(60, LABEL_MESSAGE),
  percent: z.string().transform((value, ctx) => {
    const percent = parseReceiptAmount(value);
    if (percent === undefined || percent <= 0 || percent >= 100) {
      ctx.addIssue({ code: "custom", message: PERCENT_MESSAGE });
      return z.NEVER;
    }
    return percent;
  }),
});

export const withholdingRateIdSchema = z.object({ id: z.uuid(RATE_MESSAGE) });
