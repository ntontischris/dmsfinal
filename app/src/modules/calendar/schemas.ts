import { z } from "zod";

import { KIND_COLORS, KIND_ICON_LIMIT } from "./kind-style";

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
    // Το Είδος (Ρεπό, Ραντεβού…)· κενό = χωρίς Είδος. Η βάση ελέγχει ότι είναι ενεργό.
    kindId: optionalUuid,
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

// Είδη κλεισμένου χρόνου (Ρυθμίσεις › Γυρίσματα): ονομασία έως 40 χαρακτήρες, όπως στη βάση.
const KIND_LABEL_LIMIT = 40;
const KIND_LABEL_MESSAGE = `Γράψε ονομασία Είδους από 1 έως ${KIND_LABEL_LIMIT} χαρακτήρες`;

export const kindFormSchema = z.object({
  id: optionalUuid,
  label: z.string().trim().min(1, KIND_LABEL_MESSAGE).max(KIND_LABEL_LIMIT, KIND_LABEL_MESSAGE),
});

export const kindIdSchema = z.object({ id: z.uuid("Το Είδος δεν βρέθηκε") });

// Ύφος Είδους (σχέδιο «3B»): χρώμα μόνο από την παλέτα· εικονίδιο έως 4 χαρακτήρες (όπως τα μετρά η βάση), κενό = χωρίς.
const ICON_MESSAGE = `Το εικονίδιο έχει έως ${KIND_ICON_LIMIT} χαρακτήρες`;

export const kindStyleSchema = z.object({
  id: z.uuid("Το Είδος δεν βρέθηκε"),
  color: z.enum(KIND_COLORS, "Διάλεξε χρώμα από την παλέτα"),
  icon: z
    .string()
    .trim()
    .refine((value) => [...value].length <= KIND_ICON_LIMIT, ICON_MESSAGE)
    .transform((value) => value || null),
  // Κενό = μένει ως έχει (η βάση το κρατά).
  becomesFilming: z.boolean().optional(),
});
