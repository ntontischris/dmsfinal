import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Ο επεξεργαστής της ουράς Γεγονότων (#170, ADR 0018): η βάση εφαρμόζει τους ενεργούς Αυτοματισμούς και γράφει
// Ειδοποιήσεις και email (kind «automation»). Τρέχει στο cron της ουράς ΠΡΙΝ από τον worker, ώστε τα email να φύγουν
// στον ίδιο κύκλο. Σφάλμα καταγράφεται μόνο με το μήνυμα της βάσης και δεν σταματά τον worker.

const summarySchema = z.object({
  processed: z.number(),
  failed: z.number(),
  sent: z.number(),
  cleaned: z.number(),
});

export type EventsOutcome = z.infer<typeof summarySchema> | { error: string };

const EMPTY = { processed: 0, failed: 0, sent: 0, cleaned: 0 };

export async function processEvents(
  admin: SupabaseClient,
): Promise<EventsOutcome> {
  const { data, error } = await admin.rpc("events_process");
  if (error) {
    console.error("events_process", error.message);
    return { error: "Τα Γεγονότα δεν επεξεργάστηκαν." };
  }
  const parsed = summarySchema.safeParse(data);
  return parsed.success ? parsed.data : EMPTY;
}
