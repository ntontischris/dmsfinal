import type { SupabaseClient } from "@supabase/supabase-js";

// Τιμολογητέα (#151): η γεννήτρια τρέχει στο cron πριν από τον worker της ουράς. Idempotent· σφάλμα δεν σταματά τον worker.
// Σφάλμα καταγράφεται μόνο με το μήνυμα της βάσης (χωρίς μυστικά).

export type BillablesOutcome = { generated: number } | { error: string };

export async function generateBillables(admin: SupabaseClient): Promise<BillablesOutcome> {
  const { data, error } = await admin.rpc("billables_generate");
  if (error) {
    console.error("billables_generate", error.message);
    return { error: "Τα Τιμολογητέα δεν γεννήθηκαν." };
  }
  return { generated: typeof data === "number" ? data : 0 };
}
