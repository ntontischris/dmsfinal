import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type {
  DeliverableCandidates,
  DeliverableCard,
  DeliverableDetail,
  QueueView,
} from "./types";
import {
  deliverableCandidatesSchema,
  deliverableCardsSchema,
  deliverableDetailSchema,
} from "./view-schema";

// Ανάγνωση των Παραδοτέων. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.

const NOT_VISIBLE = ["P0001", "42501"]; // «δεν βρέθηκε» ή «δεν έχεις Δικαίωμα»: όχι σφάλμα φόρτωσης

export async function listDeliverableQueue(
  view: QueueView,
): Promise<ReadResult<DeliverableCard[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listDeliverableQueue",
    supabase.rpc("deliverables_queue_view", { p_view: view }),
    (data) => deliverableCardsSchema.parse(data),
  );
}

export async function listPendingCharges(): Promise<
  ReadResult<DeliverableCard[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listPendingCharges",
    supabase.rpc("deliverables_pending_charges"),
    (data) => deliverableCardsSchema.parse(data),
  );
}

// Άγνωστο Παραδοτέο (η βάση λέει «δεν βρέθηκε») δίνει null, όχι σφάλμα φόρτωσης.
export async function getDeliverable(
  deliverableId: string,
): Promise<ReadResult<DeliverableDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("deliverable_view", {
    p_id: deliverableId,
  });
  if (error && NOT_VISIBLE.includes(error.code ?? ""))
    return { ok: true, data: null };
  if (error) {
    console.error("getDeliverable:", error.message);
    return { ok: false };
  }
  return { ok: true, data: deliverableDetailSchema.parse(data) };
}

// Υποψήφια για το «Νέο Παραδοτέο» της G2· null αν δεν έχει Δικαίωμα σε αυτή την Παραγωγή.
export async function getDeliverableCandidates(
  productionId: string,
): Promise<ReadResult<DeliverableCandidates | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("deliverable_candidates", {
    p_production: productionId,
  });
  if (error && NOT_VISIBLE.includes(error.code ?? ""))
    return { ok: true, data: null };
  if (error) {
    console.error("getDeliverableCandidates:", error.message);
    return { ok: false };
  }
  return { ok: true, data: deliverableCandidatesSchema.parse(data) };
}
