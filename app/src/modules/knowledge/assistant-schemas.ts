import { z } from "zod";

import { IGNORE_REASONS } from "./assistant-view-schema";

// Φόρμες των Συζητήσεων και των Αναπάντητων. Η βάση ξαναελέγχει τα πάντα· εδώ για καθαρό μήνυμα πριν από το RPC.

const idSchema = z.uuid("Άκυρη εγγραφή.");

export const conversationIdSchema = z.object({ id: idSchema });

export const coverSchema = z.object({
  id: idSchema,
  itemId: z.uuid("Διάλεξε δημοσιευμένο στοιχείο της Γνώσης."),
});

export const ignoreSchema = z.object({
  id: idSchema,
  reason: z.enum(IGNORE_REASONS, "Διάλεξε λόγο."),
});

export const reopenSchema = z.object({ id: idSchema });
