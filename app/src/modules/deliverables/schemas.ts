import { z } from "zod";

import { CANCEL_OUTCOMES } from "./types";
import { linkProblem } from "./link";
import { parseTimecode } from "./timecode";

// Έλεγχος των φορμών των Παραδοτέων στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Η βάση ελέγχει ξανά (δικαίωμα, κατάσταση, όριο)· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

const text = z.string().trim();
const NOTE_LIMIT = 500;
const TIMECODE_MESSAGE = "Ο χρόνος γράφεται ως mm:ss, π.χ. 0:12.";
const REASON_MESSAGE = "Γράψε λόγο.";

const note = text.max(NOTE_LIMIT, "Η σημείωση είναι μέχρι 500 χαρακτήρες.");
const title = text
  .min(1, "Γράψε τίτλο για το Παραδοτέο.")
  .max(200, "Ο τίτλος είναι μέχρι 200 χαρακτήρες.");
const link = text.superRefine((url, ctx) => {
  const problem = linkProblem(url);
  if (problem !== null) ctx.addIssue({ code: "custom", message: problem });
});

// Το «χωρίς» ως κενή τιμή γίνεται null (π.χ. «Χωρίς υπεύθυνο», «Χωρίς Γύρισμα»).
const optionalUuid = z
  .union([z.literal(""), z.uuid()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalNote = note.optional().transform((value) => (value ? value : null));

const deliverableRef = z.object({ deliverableId: z.uuid() });

export const createSchema = z
  .object({
    productionId: z.uuid(),
    kindId: z.uuid("Διάλεξε είδος Παροχής."),
    title,
    assigneeId: optionalUuid,
    filmingId: optionalUuid,
    charge: z
      .enum(["", "pending", "free"])
      .optional()
      .transform((value) => (value ? value : null)),
    chargeReason: optionalNote,
  })
  .superRefine((value, ctx) => {
    if (value.charge === "free" && value.chargeReason === null)
      ctx.addIssue({
        code: "custom",
        path: ["chargeReason"],
        message: "Η χωρίς χρέωση θέλει λόγο.",
      });
  });

export const updateSchema = z.object({
  deliverableId: z.uuid(),
  title,
  assigneeId: optionalUuid,
  filmingId: optionalUuid,
});

export const versionAddSchema = z.object({
  deliverableId: z.uuid(),
  url: link,
  note: optionalNote,
});

export const returnSchema = deliverableRef.extend({
  note: note.min(1, "Η επιστροφή θέλει σημείωση."),
});

export const linkFixSchema = z.object({
  deliverableId: z.uuid(),
  url: link,
});

export const cancelSchema = deliverableRef.extend({
  reason: note.min(1, "Η ακύρωση θέλει λόγο."),
  outcome: z.enum(CANCEL_OUTCOMES, {
    error: "Διάλεξε «Η Παροχή καταναλώθηκε» ή «Επιστρέφει στην Περίοδο».",
  }),
});

export const commentSchema = z.object({
  deliverableId: z.uuid(),
  versionNumber: z.coerce.number().int().min(1),
  body: text
    .min(1, "Γράψε σχόλιο.")
    .max(2000, "Το σχόλιο είναι μέχρι 2000 χαρακτήρες."),
  atSeconds: text
    .refine((value) => parseTimecode(value) !== undefined, TIMECODE_MESSAGE)
    .transform((value) => parseTimecode(value) ?? null),
  isInternal: z
    .string()
    .optional()
    .transform((value) => value === "1"),
});

export const chargeDecisionSchema = z
  .object({
    deliverableId: z.uuid(),
    charge: z.enum(["charged", "free"], {
      error: "Διάλεξε «Χρεώνεται» ή «Χωρίς χρέωση».",
    }),
    reason: optionalNote,
  })
  .superRefine((value, ctx) => {
    if (value.charge === "free" && value.reason === null)
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: REASON_MESSAGE,
      });
  });

export const queueFilterSchema = z.object({
  view: z.enum(["mine", "review", "client"]).catch("mine"),
});

export const deliverableIdSchema = z.object({ deliverableId: z.uuid() });
