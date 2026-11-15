import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { ClientReminder } from "./types";

// Φροντίδα Πελάτη (b7): οι ανοιχτές υπενθυμίσεις μου σε έναν Πελάτη (η RLS δίνει μόνο τις δικές μου) και αν ο
// Πελάτης είναι σε φάση «Ανανέωσης» (sales_client_renewal_due, με το παράθυρο των Ρυθμίσεων των Συμφωνιών).

const reminderSchema = z.array(
  z.object({ id: z.string(), remind_on: z.string(), note: z.string() }),
);

export async function listMyClientReminders(
  clientId: string,
): Promise<ReadResult<ClientReminder[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listMyClientReminders",
    supabase
      .from("client_reminders")
      .select("id, remind_on, note")
      .eq("client_id", clientId)
      .is("done_at", null)
      .order("remind_on")
      .limit(20),
    (data) =>
      reminderSchema
        .parse(data)
        .map((row) => ({
          id: row.id,
          remindOn: row.remind_on,
          note: row.note,
        })),
  );
}

export async function getClientRenewalDue(
  clientId: string,
): Promise<ReadResult<boolean>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getClientRenewalDue",
    supabase.rpc("sales_client_renewal_due", { p_client: clientId }),
    (data) => z.boolean().parse(data),
  );
}
