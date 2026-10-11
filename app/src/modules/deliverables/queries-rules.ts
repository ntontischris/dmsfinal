import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { DeliverableRules } from "./rules-types";
import { rulesViewSchema } from "./rules-view-schema";

// Οι Κανόνες Παραδοτέων για τη σελίδα Ρυθμίσεων. Η βάση κρίνει το Δικαίωμα.
export async function getDeliverableRules(): Promise<ReadResult<DeliverableRules>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getDeliverableRules",
    supabase.rpc("deliverable_settings_view"),
    (data) => rulesViewSchema.parse(data),
  );
}
