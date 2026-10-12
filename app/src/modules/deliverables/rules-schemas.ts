import { z } from "zod";

// Έλεγχος των Κανόνων Παραδοτέων στο όριο του server. Τα πεδία έρχονται ως κείμενο· το κενό είναι λάθος, όχι 0.
// Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

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
});

// Η γραμμή ενός είδους: μόνο η προθεσμία. Το όριο αλλαγών το αλλάζουν οι Ρυθμίσεις › Συμφωνίες.
export const kindRowSchema = z.object({
  id: z.uuid(),
  deadlineDays: wholeNumber(DEADLINE_MESSAGE, 1, 90),
});

export type RulesFormInput = z.infer<typeof rulesFormSchema>;
export type KindRowInput = z.infer<typeof kindRowSchema>;
