import { z } from "zod";

import { moneyField } from "./invoices-schemas";

// Έλεγχος των φορμών Διόρθωσης και Ακύρωσης στο όριο του server. Η βάση ελέγχει ξανά (P0001).

const ID_MESSAGE = "Το Τιμολόγιο δεν βρέθηκε.";
const DATE_MESSAGE = "Γράψε ημερομηνία.";
const NUMBER_MESSAGE = "Γράψε αριθμό από 1 έως 40 χαρακτήρες.";
const AMOUNT_MESSAGE = "Γράψε ποσό σε ευρώ, π.χ. 1300 ή 1300,50.";
const TOTAL_MESSAGE = "Γράψε το σύνολο σε ευρώ (μεγαλύτερο από 0).";
const MARK_MESSAGE = "Ο ΜΑΡΚ έχει μόνο ψηφία (έως 20).";
const REASON_MESSAGE = "Ο λόγος έχει έως 500 χαρακτήρες.";
const VOID_REASON_MESSAGE = "Γράψε τον λόγο ακύρωσης (έως 500 χαρακτήρες).";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const correctionFormSchema = z.object({
  id: z.uuid(ID_MESSAGE),
  number: z.string().trim().min(1, NUMBER_MESSAGE).max(40, NUMBER_MESSAGE),
  issueDate: z.string().regex(DAY, DATE_MESSAGE),
  dueDate: z
    .string()
    .refine((value) => value === "" || DAY.test(value), DATE_MESSAGE)
    .transform((value) => (value === "" ? null : value)),
  net: moneyField(AMOUNT_MESSAGE, 0),
  vat: moneyField(AMOUNT_MESSAGE, 0),
  total: moneyField(TOTAL_MESSAGE, 0.01),
  mark: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{1,20}$/.test(value), MARK_MESSAGE),
  reason: z.string().trim().max(500, REASON_MESSAGE),
});

export const voidFormSchema = z.object({
  id: z.uuid(ID_MESSAGE),
  reason: z
    .string()
    .trim()
    .min(1, VOID_REASON_MESSAGE)
    .max(500, VOID_REASON_MESSAGE),
});

export const correctionFormKeys = [
  "id",
  "number",
  "issueDate",
  "dueDate",
  "net",
  "vat",
  "total",
  "mark",
  "reason",
] as const;

export type CorrectionValues = z.infer<typeof correctionFormSchema>;

// Το payload του RPC: η λήξη λείπει όταν δεν υπάρχει (πιστωτικό), ώστε να μείνει όπως ήταν.
export const correctionPayload = (values: CorrectionValues) => ({
  number: values.number,
  issueDate: values.issueDate,
  ...(values.dueDate === null ? {} : { dueDate: values.dueDate }),
  net: values.net,
  vat: values.vat,
  total: values.total,
  mark: values.mark,
});
