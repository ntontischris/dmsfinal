import type { SupabaseClient } from "@supabase/supabase-js";

// Σύνοψη αδιάβαστων Μηνυμάτων (#164, Μ4): η βάση βάζει τα email στην ουρά (μία φορά ανά κύμα νέων Μηνυμάτων)·
// ο worker του ίδιου cron τα στέλνει. Σφάλμα καταγράφεται μόνο με το μήνυμα της βάσης και δεν σταματά τον worker.

export type DigestOutcome = { queued: number } | { error: string };

export async function enqueueMessageDigest(
  admin: SupabaseClient,
): Promise<DigestOutcome> {
  const { data, error } = await admin.rpc("message_digest_enqueue");
  if (error) {
    console.error("message_digest_enqueue", error.message);
    return { error: "Οι συνόψεις Μηνυμάτων δεν μπήκαν στην ουρά." };
  }
  return { queued: typeof data === "number" ? data : 0 };
}
