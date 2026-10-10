import { z } from "zod";

// Τα πεδία της φόρμας Κλεισμένου χρόνου. Η βάση ξανελέγχει όλα· εδώ φεύγουν τα λάθος σχήματα πριν από την κλήση.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const TITLE_LIMIT = 120;

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .transform((value) => value || null);
const optionalDay = z
  .union([z.string().regex(DAY), z.literal("")])
  .transform((value) => value || null);
const day = z.string().regex(DAY, "Γράψε μέρα");
const clock = z.string().regex(CLOCK, "Γράψε ώρα");

export const blockedFormSchema = z
  .object({
    id: optionalUuid,
    userId: optionalUuid,
    day,
    untilDay: optionalDay,
    allDay: z.boolean(),
    from: z.union([clock, z.literal("")]),
    to: z.union([clock, z.literal("")]),
    title: z
      .string()
      .trim()
      .max(TITLE_LIMIT, `Ο τίτλος έχει έως ${TITLE_LIMIT} χαρακτήρες`)
      .transform((value) => value || null),
  })
  .superRefine((fields, context) => {
    if (!fields.allDay && (fields.from === "" || fields.to === "")) {
      context.addIssue({
        code: "custom",
        message: "Γράψε ώρα αρχής και τέλους",
        path: ["from"],
      });
    }
  })
  .transform((fields) => ({
    ...fields,
    from: fields.from || "00:00",
    to: fields.to || "00:00",
  }));

export const blockedDeleteSchema = z.object({
  id: z.uuid(),
  day: day,
});
