import "server-only";

import { createSupabase } from "@/lib/supabase/server";

import { healthViewSchema, type HealthView } from "./schemas";

export type HealthResult = { ok: true; data: HealthView } | { ok: false };

// Η P2 (#215): μία κλήση στη βάση (health_view, health.view με έλεγχο πρώτο). Όλα υπολογίζονται εκείνη τη στιγμή.
export async function getHealth(): Promise<HealthResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("health_view", {});
  if (error) {
    console.error("health_view", error.message);
    return { ok: false };
  }
  const view = healthViewSchema.safeParse(data);
  if (!view.success) {
    console.error("health_view", view.error.message);
    return { ok: false };
  }
  return { ok: true, data: view.data };
}
