import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Ο έλεγχος χρονισμών (#172, Α4): η βάση υπολογίζει από την τρέχουσα κατάσταση τι ωρίμασε τώρα για τους Αυτοματισμούς
// «με ημερομηνία» και «αναμονής» και γράφει Ειδοποιήσεις και email (kind «automation»). Τρέχει στο cron της ουράς ΠΡΙΝ από
// τον worker, ώστε τα email να φύγουν στον ίδιο κύκλο. Σφάλμα καταγράφεται μόνο με το μήνυμα της βάσης και δεν σταματά τον worker.

const summarySchema = z.object({ sent: z.number(), failed: z.number() });

export type ScanOutcome = z.infer<typeof summarySchema> | { error: string };

const EMPTY = { sent: 0, failed: 0 };

export async function scanAutomations(
  admin: SupabaseClient,
): Promise<ScanOutcome> {
  const { data, error } = await admin.rpc("automations_scan");
  if (error) {
    console.error("automations_scan", error.message);
    return { error: "Ο έλεγχος χρονισμών δεν έτρεξε." };
  }
  const parsed = summarySchema.safeParse(data);
  return parsed.success ? parsed.data : EMPTY;
}
