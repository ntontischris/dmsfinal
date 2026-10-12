"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { kickOutbox } from "@/lib/email/outbox-trigger";
import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { SENDS_PATH } from "./sends-helpers";
import { RETRY_DONE } from "./sends-labels";
import { retrySchema } from "./sends-schema";

// «Ξαναστείλε» (K3, #174): η βάση ελέγχει το Δικαίωμα, ότι το email απέτυχε και ότι δεν ξαναστάλθηκε ήδη.
export async function retrySend(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = retrySchema.safeParse({ ref: form.get("ref") });
  if (!parsed.success) return { error: "Η αποστολή δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
  const { error } = await supabase.rpc("send_retry", {
    p_ref: parsed.data.ref,
  });
  if (error) {
    console.error("retrySend:", error.message);
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Δεν ξαναστάλθηκε. Δοκίμασε ξανά.",
    };
  }
  after(() => kickOutbox());
  revalidatePath(SENDS_PATH);
  return { notice: RETRY_DONE };
}
