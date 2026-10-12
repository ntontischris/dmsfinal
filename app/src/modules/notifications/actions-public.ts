"use server";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { UNSUBSCRIBE_DONE, UNSUBSCRIBE_ERROR } from "./labels";
import { unsubscribeTokenSchema } from "./schemas";

// Η διακοπή email από τη δημόσια σελίδα /u/<token> (#171, Α10). Ανώνυμη, όπως ο Σύνδεσμος πρότασης: μιλά μόνο στο
// automation_unsubscribe. Η απάντηση είναι ίδια για κάθε token (έγκυρο, άκυρο ή απαραίτητου Αυτοματισμού).
// Το token δεν καταγράφεται πουθενά, ούτε στα σφάλματα.
export async function unsubscribe(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const token = unsubscribeTokenSchema.safeParse(form.get("token"));
  if (!token.success) return { notice: UNSUBSCRIBE_DONE };
  const supabase = await createSupabase();
  if (!supabase) return { error: UNSUBSCRIBE_ERROR };
  const { error } = await supabase.rpc("automation_unsubscribe", {
    p_token: token.data,
  });
  if (error) {
    console.error("unsubscribe", error.code);
    return { error: UNSUBSCRIBE_ERROR };
  }
  return { notice: UNSUBSCRIBE_DONE };
}
