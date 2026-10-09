import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type {
  EquipmentCategory,
  EquipmentItemDetail,
  EquipmentItemRow,
  EquipmentTemplate,
} from "./types";
import {
  categoriesViewSchema,
  itemDetailSchema,
  itemsViewSchema,
  templatesViewSchema,
} from "./view-schema";

// Ανάγνωση του Εξοπλισμού. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.

const P0001 = "P0001"; // «δεν βρέθηκε»: δεν είναι σφάλμα φόρτωσης

export async function listItems(
  options: { includeRetired?: boolean } = {},
): Promise<ReadResult<EquipmentItemRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listEquipmentItems",
    supabase.rpc("equipment_items_view", {
      p_include_retired: options.includeRetired ?? false,
    }),
    (data) => itemsViewSchema.parse(data),
  );
}

// Άγνωστο αντικείμενο (η βάση λέει «δεν βρέθηκε») δίνει null, όχι σφάλμα φόρτωσης.
export async function getItem(
  itemId: string,
): Promise<ReadResult<EquipmentItemDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("equipment_item_view", {
    p_item: itemId,
  });
  if (error?.code === P0001) return { ok: true, data: null };
  if (error) {
    console.error("getEquipmentItem:", error.message);
    return { ok: false };
  }
  return { ok: true, data: itemDetailSchema.parse(data) };
}

export async function listCategories(
  options: { includeRetired?: boolean } = {},
): Promise<ReadResult<EquipmentCategory[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listEquipmentCategories",
    supabase.rpc("equipment_categories_view", {
      p_include_retired: options.includeRetired ?? false,
    }),
    (data) => categoriesViewSchema.parse(data),
  );
}

export async function listTemplates(): Promise<
  ReadResult<EquipmentTemplate[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listEquipmentTemplates",
    supabase.rpc("equipment_templates_view"),
    (data) => templatesViewSchema.parse(data),
  );
}
