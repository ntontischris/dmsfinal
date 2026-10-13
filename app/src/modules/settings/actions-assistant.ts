"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { rpcMessage } from "@/lib/rpc-error";
import { createSupabase } from "@/lib/supabase/server";

// Ρυθμίσεις › Εταιρεία › Βοηθός: μηνιαίο πλαφόν δαπάνης AI και μερίδιο δημόσιου widget. Μόνο ο Ιδιοκτήτης
// (assistant_cap_save: ο έλεγχος γίνεται πρώτος στη βάση, 42501 για όλους τους άλλους).

const capSchema = z.object({
  ai_monthly_cap_usd: z.coerce
    .number()
    .min(0, "Το πλαφόν δεν είναι έγκυρο.")
    .max(999999.99, "Το πλαφόν δεν είναι έγκυρο."),
  ai_widget_share: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, "Το μερίδιο είναι από 0 έως 100%."),
});

export async function saveAssistantCap(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = capSchema.safeParse({
    ai_monthly_cap_usd: form.get("ai_monthly_cap_usd"),
    ai_widget_share: form.get("ai_widget_share"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabase();
  if (!supabase) return { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
  const { error } = await supabase.rpc("assistant_cap_save", {
    p_cap: parsed.data.ai_monthly_cap_usd,
    p_share: parsed.data.ai_widget_share,
    p_version: String(form.get("version") ?? "") || null,
  });
  if (error)
    return { error: rpcMessage(error, "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.") };
  revalidatePath("/app/settings", "layout");
  return {
    notice: "Αποθηκεύτηκε. Ισχύει από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.",
  };
}
