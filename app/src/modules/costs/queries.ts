import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { CostDetail, CostGroup, CostRow } from "./types";
import { parseCostDetail, parseCostRows } from "./view-schema";

// Ανάγνωση του κόστους. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.

const NOT_VISIBLE = ["P0001", "42501"]; // «δεν βρέθηκε» ή «δεν έχεις Δικαίωμα»: όχι σφάλμα φόρτωσης

export async function listCostRows(group: CostGroup): Promise<ReadResult<CostRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listCostRows",
    supabase.rpc("production_costs_view", { p_group: group }),
    parseCostRows,
  );
}

// Άγνωστη Παραγωγή ή χωρίς Δικαίωμα δίνει null, όχι σφάλμα φόρτωσης.
export async function getCostDetail(productionId: string): Promise<ReadResult<CostDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("production_cost_view", {
    p_production: productionId,
  });
  if (error && NOT_VISIBLE.includes(error.code ?? "")) return { ok: true, data: null };
  if (error) {
    console.error("getCostDetail:", error.message);
    return { ok: false };
  }
  return { ok: true, data: parseCostDetail(data) };
}

export async function countNeedsHours(): Promise<ReadResult<number>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("countNeedsHours", supabase.rpc("production_needs_hours_count"), Number);
}
