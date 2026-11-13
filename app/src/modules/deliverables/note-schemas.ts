import { z } from "zod";

// Φόρμες των σημειώσεων πάνω στο βίντεο (απάντηση, «λύθηκε», «το είδε»), κοινές για ομάδα και πελάτη.
// Η βάση ξαναελέγχει τα πάντα.

export const replySchema = z.object({
  parentId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Γράψε απάντηση.")
    .max(2000, "Η απάντηση είναι μέχρι 2000 χαρακτήρες."),
  isInternal: z
    .string()
    .optional()
    .transform((value) => value === "1"),
});

export const resolveSchema = z.object({
  commentId: z.uuid(),
  resolved: z
    .enum(["1", "0"], { error: "Διάλεξε «Λύθηκε» ή «Ξανανοίγει»." })
    .transform((value) => value === "1"),
});

export const seenSchema = z.object({
  deliverableId: z.uuid(),
  versionNumber: z.number().int().min(1),
});
