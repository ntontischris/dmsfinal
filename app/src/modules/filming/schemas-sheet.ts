import { z } from "zod";

import { optionalText, uuid } from "./schemas";

// Φόρμες του Δελτίου γυρίσματος: αποθήκευση λήψεων και σημείωσης, έκδοση. Η βάση ελέγχει ξανά (έως 100 λήψεις, 300 χαρακτήρες).

const SHOT_TEXT_LIMIT = 300;
const SHOT_LIMIT = 100;
const CREW_NOTE_LIMIT = 2000;
const CHANGE_LIMIT = 300;

const shotSchema = z.object({
  id: z.string(),
  text: z
    .string()
    .trim()
    .min(1, "Κάθε λήψη θέλει κείμενο.")
    .max(SHOT_TEXT_LIMIT, `Κάθε λήψη έχει έως ${SHOT_TEXT_LIMIT} χαρακτήρες.`),
});

// Η λίστα έρχεται ως JSON μέσα σε κρυφό πεδίο· ό,τι δεν είναι JSON σπάει εδώ.
const shotsJsonSchema = z
  .string()
  .transform((raw, context) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Η λίστα λήψεων δεν είναι έγκυρη." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(shotSchema)
      .max(SHOT_LIMIT, `Έως ${SHOT_LIMIT} λήψεις στο Δελτίο.`),
  );

export const sheetSaveSchema = z.object({
  filmingId: uuid,
  shots: shotsJsonSchema,
  crewNote: optionalText(CREW_NOTE_LIMIT),
});

export const sheetIssueSchema = z.object({
  filmingId: uuid,
  change: optionalText(CHANGE_LIMIT),
});
