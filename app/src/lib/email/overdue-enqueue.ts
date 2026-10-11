import type { SupabaseClient } from "@supabase/supabase-js";

// Ληξιπρόθεσμα Τιμολόγια (#153): η βάση βάζει τα email στην ουρά (μία φορά ανά Τιμολόγιο, μετά τις 09:00 Αθήνας)·
// ο worker του ίδιου cron τα στέλνει. Σφάλμα καταγράφεται μόνο με το μήνυμα της βάσης και δεν σταματά τον worker.

export type OverdueOutcome = { queued: number } | { error: string };

export async function enqueueOverdueInvoices(admin: SupabaseClient): Promise<OverdueOutcome> {
  const { data, error } = await admin.rpc("invoice_overdue_enqueue");
  if (error) {
    console.error("invoice_overdue_enqueue", error.message);
    return { error: "Τα ληξιπρόθεσμα δεν μπήκαν στην ουρά." };
  }
  return { queued: typeof data === "number" ? data : 0 };
}
