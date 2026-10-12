import { z } from "zod";

// Ρυθμίσεις › Μηνύματα (Μ14). Τα όρια ταυτίζονται με της βάσης (message_settings). Τα πεδία έρχονται ως κείμενο· το κενό είναι λάθος.
// Τα λεπτά σύνοψης αλλάζουν στους Αυτοματισμούς (#172).

export const MESSAGE_SETTINGS_LIMITS = {
  editMinutes: { min: 1, max: 1440 },
  requestOpenDays: { min: 1, max: 60 },
} as const;

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

export const messageSettingsFormSchema = z.object({
  editMinutes: wholeNumber(
    "Τα λεπτά διόρθωσης είναι ακέραιος αριθμός από 1 έως 1.440.",
    1,
    1440,
  ),
  requestOpenDays: wholeNumber(
    "Οι μέρες ανοιχτού Αιτήματος είναι ακέραιος αριθμός από 1 έως 60.",
    1,
    60,
  ),
});

export type MessageSettingsInput = z.infer<typeof messageSettingsFormSchema>;

// Το JSON της message_settings_get.
export const messageSettingsViewSchema = z.object({
  editMinutes: z.number().int(),
  requestOpenDays: z.number().int(),
});

export type MessageSettings = z.infer<typeof messageSettingsViewSchema>;
