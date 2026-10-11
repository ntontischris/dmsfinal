import { after } from "next/server";

import { createSupabase } from "@/lib/supabase/server";

// Σημειώνει τη Συνομιλία ως διαβασμένη αφού σταλεί η σελίδα, ώστε ο δείκτης «νέο» της τρέχουσας απόδοσης να μένει όπως ήταν.
// Ο client φτιάχνεται πριν (τα cookies δεν διαβάζονται μέσα στο after).
export async function markThreadReadAfterRender(clientId: string): Promise<void> {
  const supabase = await createSupabase();
  if (!supabase) return;
  after(async () => {
    const { error } = await supabase.rpc("messages_mark_read", { p_client: clientId });
    if (error) console.error("markThreadRead:", error.message);
  });
}
