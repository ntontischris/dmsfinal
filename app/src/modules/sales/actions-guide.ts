"use server";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import {
  UNCONFIGURED,
  firstIssue,
  messageOf,
  pick,
  refreshSales,
} from "./action-support";
import { guideSectionSchema } from "./settings-schemas";

// «Οδηγός πωλήσεων» (b15): ποια Ενότητα της Γνώσης ανοίγει από τον χώρο Πωλήσεων. Γράφεται απευθείας με RLS
// («Διαχειρίζεται Ρυθμίσεις»)· η βάση ελέγχει ότι η Ενότητα υπάρχει.
export async function saveGuideSection(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = guideSectionSchema.safeParse(pick(form, ["value"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const section = parsed.data.value === "none" ? null : parsed.data.value;
  const { data, error } = await supabase
    .from("sales_settings")
    .update({ knowledge_section_id: section })
    .eq("id", true)
    .select("knowledge_section_id");
  if (error) return { error: messageOf(error) };
  if (!data || data.length === 0)
    return { error: "Δεν έχεις Δικαίωμα για αυτή την αλλαγή." };
  refreshSales();
  return { notice: "Αποθηκεύτηκε." };
}
