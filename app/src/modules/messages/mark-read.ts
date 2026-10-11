import { after } from "next/server";

import { createSupabase } from "@/lib/supabase/server";

// Σημειώνει τη Συνομιλία ως διαβασμένη αφού σταλεί η σελίδα, μέχρι το νεότερο Μήνυμα που ΦΑΝΗΚΕ (όχι «τώρα»):
// ό,τι γράφτηκε μετά την ανάγνωση της σελίδας μένει αδιάβαστο.
// Ο client φτιάχνεται πριν (τα cookies δεν διαβάζονται μέσα στο after).
export async function markThreadReadAfterRender(
  clientId: string,
  until: string,
): Promise<void> {
  const supabase = await createSupabase();
  if (!supabase) return;
  after(async () => {
    const { error } = await supabase.rpc("messages_mark_read", {
      p_client: clientId,
      p_until: until,
    });
    if (error) console.error("markThreadRead:", error.message);
  });
}
