import { createSupabase } from "@/lib/supabase/server";

import type { ReadResult } from "./read";
import type { SheetView } from "./sheet-types";
import { sheetViewSchema } from "./view-schema-sheet";

// Το Δελτίο γυρίσματος (RPC filming_sheet_view). «Δεν βρέθηκε» ή «δεν έχεις Δικαίωμα» είναι «χωρίς Δελτίο», όχι σφάλμα.

const NOT_VISIBLE = ["P0001", "42501"];

export async function getSheet(filmingId: string): Promise<ReadResult<SheetView | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("filming_sheet_view", { p_id: filmingId });
  if (error && NOT_VISIBLE.includes(error.code ?? "")) return { ok: true, data: null };
  if (error) {
    console.error("getSheet:", error.message);
    return { ok: false };
  }
  return { ok: true, data: sheetViewSchema.parse(data) };
}
