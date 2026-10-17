import "server-only";

import { createSupabase } from "@/lib/supabase/server";

import { connectionStatuses, type ConnectionStatus } from "./connections";
import { configuredFrom } from "./environment";
import { factsSchema, type AnalyticsIds } from "./schemas";

// Η μία πηγή κατάστασης των συνδέσεων (Ν9), για τη N5 και, αργότερα, για την Υγεία (P2): γεγονότα από τη βάση
// (integrations_view, με την πύλη της βάσης) + ποιες ρυθμίσεις υπάρχουν στο περιβάλλον → μία κάρτα ανά σύνδεση.
// Ό,τι επιστρέφει είναι ασφαλές για τον browser: καμία τιμή κλειδιού δεν περνά από εδώ.

export interface ConnectionsView {
  connections: ConnectionStatus[];
  analytics: AnalyticsIds;
}

export type ConnectionsResult =
  { ok: true; data: ConnectionsView } | { ok: false };

export async function getConnectionStatuses(): Promise<ConnectionsResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("integrations_view", {});
  if (error) {
    console.error("integrations_view", error.message);
    return { ok: false };
  }
  const facts = factsSchema.safeParse(data);
  if (!facts.success) {
    console.error("integrations_view", facts.error.message);
    return { ok: false };
  }
  return {
    ok: true,
    data: {
      connections: connectionStatuses(facts.data, configuredFrom()),
      analytics: facts.data.analytics,
    },
  };
}
