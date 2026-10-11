import { z } from "zod";

// Έλεγχος των Κανόνων Παραδοτέων στο όριο του server. Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

const REMINDER_LIMIT = 5;
const REMINDER_MESSAGE = "Οι υπενθυμίσεις είναι ακέραιες μέρες, π.χ. 3, 7.";

// Η γραμμή «3, 7» γίνεται λίστα αριθμών. Κενό = καμία υπενθύμιση.
export const formatReminderDays = (days: readonly number[]): string =>
  days.join(", ");

const parseReminderText = (text: string): number[] =>
  text.trim() === ""
    ? []
    : text.split(",").map((part) => Number(part.trim()));

const isStrictlyAscending = (days: readonly number[]): boolean =>
  days.every((day, index) => index === 0 || day > (days[index - 1] ?? 0));

const reminderDays = z
  .string()
  .transform(parseReminderText)
  .pipe(
    z
      .array(z.number({ error: REMINDER_MESSAGE }).int(REMINDER_MESSAGE).min(1, "Οι υπενθυμίσεις είναι από 1 έως 60 μέρες.").max(60, "Οι υπενθυμίσεις είναι από 1 έως 60 μέρες."))
      .max(REMINDER_LIMIT, "Βάλε έως πέντε υπενθυμίσεις.")
      .refine(isStrictlyAscending, "Οι υπενθυμίσεις πρέπει να είναι σε αύξουσα σειρά, χωρίς διπλότυπα."),
  );

export const rulesFormSchema = z.object({
  internalReview: z.boolean(),
  changesDays: z.number().int().min(0, "Οι μέρες είναι από 0 έως 30.").max(30, "Οι μέρες είναι από 0 έως 30."),
  reminderDays,
});

// Η γραμμή ενός είδους: προθεσμία 1–90 μέρες και όριο αλλαγών 1–20, ή κενό όριο = καμία αλλαγή.
export const kindRowSchema = z.object({
  id: z.uuid(),
  deadlineDays: z.number().int().min(1, "Η προθεσμία είναι από 1 έως 90 εργάσιμες.").max(90, "Η προθεσμία είναι από 1 έως 90 εργάσιμες."),
  revisionLimit: z
    .number()
    .int()
    .min(1, "Το όριο αλλαγών είναι από 1 έως 20.")
    .max(20, "Το όριο αλλαγών είναι από 1 έως 20.")
    .nullable(),
});

export type RulesFormInput = z.infer<typeof rulesFormSchema>;
export type KindRowInput = z.infer<typeof kindRowSchema>;
