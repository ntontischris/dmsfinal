import { z } from "zod";

import { linkProblem } from "./link";
import { REQUEST_DECISIONS } from "./types";

// Φόρμες της ομάδας για τα Αιτήματα μετά την έγκριση και τα Τελικά αρχεία (H2). Η βάση ξαναελέγχει.

const NOTE_MAX = 2000;

export const requestDecisionSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(REQUEST_DECISIONS, {
    error: "Διάλεξε «Δεκτό ως γύρος», «Χρεώνεται» ή «Νέο Παραδοτέο».",
  }),
  note: z.string().trim().max(NOTE_MAX, "Η σημείωση είναι μέχρι 2000 χαρακτήρες."),
});

export const finalFilesSchema = z.object({
  deliverableId: z.uuid(),
  url: z
    .string()
    .trim()
    .superRefine((url, ctx) => {
      const problem = url === "" ? null : linkProblem(url);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
});
