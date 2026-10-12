"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { NOTIFICATIONS_PATH, safeLink } from "./helpers";
import { getBell } from "./queries";
import type { Bell } from "./view-schema";

// Ενέργειες των Ειδοποιήσεων (A2). Η βάση αποφασίζει ποιες είναι δικές σου· εδώ μόνο ελέγχεται η φόρμα.

const UNCONFIGURED_TEXT = "Η βάση δεν έχει συνδεθεί ακόμα.";

// Το καμπανάκι ξαναζητά τον μετρητή κάθε 30″ (μόνο όσο η σελίδα είναι ορατή). null = καμία αλλαγή στην οθόνη.
export async function refreshBell(): Promise<Bell | null> {
  const result = await getBell();
  return result.ok ? result.data : null;
}

const openSchema = z.object({ id: z.uuid() });

// «Άνοιγμα»: σημειώνει διαβασμένη και πηγαίνει στο σχετικό. Ξένη ή ανύπαρκτη: πίσω στις Ειδοποιήσεις.
export async function openNotification(form: FormData): Promise<void> {
  const parsed = openSchema.safeParse({ id: form.get("id") });
  const supabase = await createSupabase();
  if (!parsed.success || !supabase) redirect(NOTIFICATIONS_PATH);
  const { data, error } = await supabase.rpc("notification_open", {
    p_id: parsed.data.id,
  });
  if (error) console.error("openNotification:", error.message);
  revalidatePath("/app", "layout");
  redirect(
    error
      ? NOTIFICATIONS_PATH
      : safeLink(typeof data === "string" ? data : null),
  );
}

// «Όλες διαβασμένες».
export async function markAllRead(): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return { error: UNCONFIGURED_TEXT };
  const { data, error } = await supabase.rpc("notifications_mark_all_read");
  if (error) {
    console.error("markAllRead:", error.message);
    return { error: "Δεν σημειώθηκαν διαβασμένες. Δοκίμασε ξανά." };
  }
  revalidatePath("/app", "layout");
  const count = typeof data === "number" ? data : 0;
  return {
    notice:
      count === 0
        ? "Δεν υπήρχαν αδιάβαστες."
        : `${count} ${count === 1 ? "σημειώθηκε διαβασμένη" : "σημειώθηκαν διαβασμένες"}.`,
  };
}
