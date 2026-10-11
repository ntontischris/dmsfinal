import type { SupabaseClient } from "@supabase/supabase-js";

// Υπενθυμίσεις πελάτη (#143): η βάση βάζει τα email στην ουρά· ο worker του ίδιου cron τα στέλνει.
// Σφάλμα εδώ καταγράφεται μόνο με το μήνυμα της βάσης (χωρίς μυστικά) και δεν σταματά τον worker.

export type EnqueueOutcome = { queued: number } | { error: string };

export async function enqueueDeliverableReminders(
  admin: SupabaseClient,
): Promise<EnqueueOutcome> {
  const { data, error } = await admin.rpc("deliverable_reminders_enqueue");
  if (error) {
    console.error("deliverable_reminders_enqueue", error.message);
    return { error: "Οι υπενθυμίσεις δεν μπήκαν στην ουρά." };
  }
  return { queued: typeof data === "number" ? data : 0 };
}
