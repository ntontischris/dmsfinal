import "server-only";

import { createSupabase } from "@/lib/supabase/server";

import { subscriptionsViewSchema, type SubscriptionsView } from "./schemas";

export type SubscriptionsResult =
  { ok: true; data: SubscriptionsView } | { ok: false };

// Μητρώο συνδρομών με σύνολα ανά νόμισμα (subscriptions_view, μόνο Ιδιοκτήτης στη βάση).
export async function getSubscriptions(): Promise<SubscriptionsResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("subscriptions_view", {});
  if (error) {
    console.error("subscriptions_view", error.message);
    return { ok: false };
  }
  const view = subscriptionsViewSchema.safeParse(data);
  if (!view.success) {
    console.error("subscriptions_view", view.error.message);
    return { ok: false };
  }
  return { ok: true, data: view.data };
}
