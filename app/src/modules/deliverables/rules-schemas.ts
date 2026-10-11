import { z } from "zod";

// Έλεγχος των Κανόνων Παραδοτέων στο όριο του server. Τα πεδία έρχονται ως κείμενο· το κενό είναι λάθος, όχι 0.
// Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

const REMINDER_LIMIT = 5;
const REMINDER_MESSAGE = "Οι υπενθυμίσεις είναι ακέραιες μέρες, π.χ. 3, 7.";
const RANGE_REMINDER = "Οι υπενθυμίσεις είναι από 1 έως 60 μέρες.";

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
      .array(
        z
          .number({ error: REMINDER_MESSAGE })
          .int(REMINDER_MESSAGE)
          .min(1, RANGE_REMINDER)
          .max(60, RANGE_REMINDER),
      )
      .max(REMINDER_LIMIT, "Βάλε έως πέντε υπενθυμίσεις.")
      .refine(
        isStrictlyAscending,
        "Οι υπενθυμίσεις πρέπει να είναι σε αύξουσα σειρά, χωρίς διπλότυπα.",
      ),
  );

// Ακέραιος αριθμός από κείμενο φόρμας. Το κενό και το μη αριθμητικό είναι λάθος με το δικό τους μήνυμα.
const wholeNumber = (message: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, message)
    .transform(Number)
    .pipe(
      z
        .number({ error: message })
        .int(message)
        .min(min, message)
        .max(max, message),
    );

const CHANGES_MESSAGE = "Οι μέρες αλλαγών είναι ακέραιος αριθμός από 0 έως 30.";
const DEADLINE_MESSAGE = "Η προθεσμία είναι ακέραιος αριθμός από 1 έως 90 εργάσιμες.";

export const rulesFormSchema = z.object({
  internalReview: z.boolean(),
  changesDays: wholeNumber(CHANGES_MESSAGE, 0, 30),
  reminderDays,
});

// Η γραμμή ενός είδους: μόνο η προθεσμία. Το όριο αλλαγών το αλλάζουν οι Ρυθμίσεις › Συμφωνίες.
export const kindRowSchema = z.object({
  id: z.uuid(),
  deadlineDays: wholeNumber(DEADLINE_MESSAGE, 1, 90),
});

export type RulesFormInput = z.infer<typeof rulesFormSchema>;
export type KindRowInput = z.infer<typeof kindRowSchema>;
