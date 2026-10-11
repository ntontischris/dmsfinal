import { createSupabase } from "@/lib/supabase/server";

import type { ClientDeliverableDetail, ClientDeliverablesView } from "./client-types";
import { clientDeliverableDetailSchema, clientDeliverablesViewSchema } from "./client-view-schema";
import { read, type ReadResult } from "./read";

// Ανάγνωση της όψης πελάτη. Όλα περνούν από RPC· η βάση δείχνει μόνο τις Παραγωγές του Πελάτη.

const NOT_VISIBLE = ["P0001", "42501"];

export async function listClientDeliverables(): Promise<ReadResult<ClientDeliverablesView>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClientDeliverables",
    supabase.rpc("client_deliverables_view"),
    (data) => clientDeliverablesViewSchema.parse(data),
  );
}

// Άγνωστο ή μη ορατό Παραδοτέο δίνει null, όχι σφάλμα φόρτωσης.
export async function getClientDeliverable(
  deliverableId: string,
): Promise<ReadResult<ClientDeliverableDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("client_deliverable_view", { p_id: deliverableId });
  if (error && NOT_VISIBLE.includes(error.code ?? "")) return { ok: true, data: null };
  if (error) {
    console.error("getClientDeliverable:", error.message);
    return { ok: false };
  }
  return { ok: true, data: clientDeliverableDetailSchema.parse(data) };
}
