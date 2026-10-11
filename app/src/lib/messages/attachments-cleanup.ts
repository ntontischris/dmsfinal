import type { SupabaseClient } from "@supabase/supabase-js";

import { MESSAGE_ATTACHMENT_BUCKET } from "./attachment-bucket";

// Συνημμένα Μηνυμάτων (#162): θέσεις ανεβάσματος που δόθηκαν και δεν χρησιμοποιήθηκαν ποτέ. Τις σβήνει το cron του worker,
// μαζί με όποιο αρχείο πρόλαβε να ανέβει. Σφάλμα καταγράφεται και δεν σταματά τον worker.

export const SLOT_MAX_AGE_HOURS = 24;

export type AttachmentCleanupOutcome = { removed: number } | { error: string };

const toPaths = (data: unknown): string[] =>
  Array.isArray(data) ? data.filter((entry): entry is string => typeof entry === "string") : [];

export async function cleanExpiredAttachmentSlots(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<AttachmentCleanupOutcome> {
  const before = new Date(now.getTime() - SLOT_MAX_AGE_HOURS * 3_600_000).toISOString();
  const { data, error } = await admin.rpc("message_attachment_slots_expired", { p_before: before });
  if (error) {
    console.error("message_attachment_slots_expired", error.message);
    return { error: "Τα ανεκμετάλλευτα συνημμένα δεν καθαρίστηκαν." };
  }
  const paths = toPaths(data);
  if (paths.length === 0) return { removed: 0 };
  const removal = await admin.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove(paths);
  if (removal.error) {
    console.error("removeExpiredAttachments", removal.error.message);
    return { error: "Τα ανεκμετάλλευτα συνημμένα δεν καθαρίστηκαν." };
  }
  return { removed: paths.length };
}
