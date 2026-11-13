"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import type { FormState } from "./schemas";

// a3: «Κατάλαβα» στην κάρτα, και το κείμενο κάθε Ρόλου από τον Ιδιοκτήτη. Τους κανόνες τους επιβάλλει η βάση.

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };

export async function dismissFirstSteps(): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("first_steps_dismiss");
  if (error) {
    console.error("dismissFirstSteps:", error.message);
    return { error: "Η κάρτα δεν έκλεισε· δοκίμασε ξανά." };
  }
  revalidatePath("/app");
  return { notice: "Έκλεισε." };
}

const firstStepsFormSchema = z.object({
  roleId: z.uuid({ error: "Ο Ρόλος δεν βρέθηκε." }),
  body: z.string().trim().max(2000, "Το κείμενο είναι έως 2000 χαρακτήρες."),
});

export async function saveRoleFirstSteps(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = firstStepsFormSchema.safeParse({
    roleId: form.get("roleId"),
    body: form.get("body") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("role_first_steps_set", {
    p_role_id: parsed.data.roleId,
    p_body: parsed.data.body,
  });
  if (error) {
    if (error.code === "P0001") return { error: error.message };
    if (error.code === "42501")
      return { error: "Μόνο ο Ιδιοκτήτης αλλάζει τα «Πρώτα βήματα»." };
    console.error("saveRoleFirstSteps:", error.message);
    return { error: "Το κείμενο δεν αποθηκεύτηκε." };
  }
  revalidatePath("/app/team", "layout");
  return {
    notice: parsed.data.body
      ? "Αποθηκεύτηκε. Το βλέπουν όσοι έχουν τον Ρόλο και δεν έχουν κλείσει την κάρτα."
      : "Σβήστηκε: ο Ρόλος δεν δείχνει πια κάρτα.",
  };
}
