import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { OwnerCandidate, ProductionCard, ProductionDetail, ProductionState } from "./types";
import {
  ownerCandidatesViewSchema,
  productionDetailSchema,
  productionsViewSchema,
} from "./view-schema";

// Ανάγνωση των Παραγωγών. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.

const NOT_VISIBLE = ["P0001", "42501"]; // «δεν βρέθηκε» ή «δεν έχεις Δικαίωμα»: όχι σφάλμα φόρτωσης, ίδια σελίδα

export async function listProductions(options: {
  state: ProductionState | null;
  internalOnly: boolean;
}): Promise<ReadResult<ProductionCard[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listProductions",
    supabase.rpc("productions_view", {
      p_state: options.state,
      p_internal: options.internalOnly ? true : null,
    }),
    (data) => productionsViewSchema.parse(data),
  );
}

// Άγνωστη Παραγωγή (η βάση λέει «δεν βρέθηκε») δίνει null, όχι σφάλμα φόρτωσης.
export async function getProduction(
  productionId: string,
): Promise<ReadResult<ProductionDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("production_view", {
    p_production: productionId,
  });
  if (error && NOT_VISIBLE.includes(error.code ?? "")) return { ok: true, data: null };
  if (error) {
    console.error("getProduction:", error.message);
    return { ok: false };
  }
  return { ok: true, data: productionDetailSchema.parse(data) };
}

// Υποψήφιοι Υπεύθυνοι για τη μεταβίβαση και τη νέα Εσωτερική Παραγωγή (μόνο για Εύρος «όλα»).
export async function listOwnerCandidates(): Promise<ReadResult<OwnerCandidate[]>> {
  return listCandidates("listOwnerCandidates", "productions_owner_candidates");
}

// Υποψήφια Μέλη: όλοι οι ενεργοί Χρήστες ομάδας.
export async function listMemberCandidates(): Promise<ReadResult<OwnerCandidate[]>> {
  return listCandidates("listMemberCandidates", "productions_member_candidates");
}

async function listCandidates(
  label: string,
  rpc: "productions_owner_candidates" | "productions_member_candidates",
): Promise<ReadResult<OwnerCandidate[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(label, supabase.rpc(rpc), (data) => ownerCandidatesViewSchema.parse(data));
}
