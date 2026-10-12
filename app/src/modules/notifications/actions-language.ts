"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { NOTIFICATIONS_PATH } from "./helpers";
import { LANGUAGE_SAVED } from "./labels";
import { languageSchema } from "./schemas";

// Η γλώσσα των email του Χρήστη πελάτη (#171, Α8). Η βάση ελέγχει ότι είναι Χρήστης πελάτη.
export async function saveLanguage(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = languageSchema.safeParse({ language: form.get("language") });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Διάλεξε γλώσσα" };
  const supabase = await createSupabase();
  if (!supabase) return { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
  const { error } = await supabase.rpc("set_my_language", {
    p_language: parsed.data.language,
  });
  if (error) {
    console.error("saveLanguage:", error.message);
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Η γλώσσα δεν αποθηκεύτηκε. Δοκίμασε ξανά.",
    };
  }
  revalidatePath(NOTIFICATIONS_PATH);
  return { notice: LANGUAGE_SAVED };
}
