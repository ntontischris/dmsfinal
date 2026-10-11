import { z } from "zod";

import { parseTimecode } from "./timecode";

// Φόρμες του Χρήστη πελάτη (Zod πριν από κάθε RPC). Η βάση ξαναελέγχει τα πάντα.

const TIMECODE_MESSAGE = "Ο χρόνος γράφεται ως mm:ss, π.χ. 0:42.";
const note = z.string().trim().max(2000, "Η σημείωση είναι μέχρι 2000 χαρακτήρες.");

export const answerSchema = z
  .object({
    deliverableId: z.uuid(),
    decision: z.enum(["approve", "changes"], { error: "Διάλεξε απάντηση." }),
    note,
    confirmFinal: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "changes" && value.note.length === 0) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "Η ζήτηση αλλαγών θέλει σημείωση." });
    }
    if (value.decision === "approve" && value.confirmFinal !== "1") {
      ctx.addIssue({ code: "custom", path: ["confirmFinal"], message: "Επιβεβαίωσε ότι η έγκριση είναι τελική." });
    }
  });

export const clientCommentSchema = z.object({
  deliverableId: z.uuid(),
  versionNumber: z.coerce.number().int().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Γράψε σχόλιο.")
    .max(2000, "Το σχόλιο είναι μέχρι 2000 χαρακτήρες."),
  atSeconds: z
    .string()
    .refine((value) => parseTimecode(value) !== undefined, TIMECODE_MESSAGE)
    .transform((value) => parseTimecode(value) ?? null),
});

export const reportLinkSchema = z.object({
  deliverableId: z.uuid(),
  versionNumber: z.coerce.number().int().min(1),
});

export const requestChangeSchema = z.object({
  deliverableId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Γράψε τι αλλαγή ζητάς.")
    .max(2000, "Η αλλαγή είναι μέχρι 2000 χαρακτήρες."),
});
