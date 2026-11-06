import { createSupabase } from "@/lib/supabase/server";

import { contextFromAmr, type PasswordContext } from "./password-change";

// Το πλαίσιο της σελίδας «Νέος κωδικός» από το επαληθευμένο token της συνεδρίας (ίδιος έλεγχος με το setPassword).
export async function getPasswordContext(): Promise<PasswordContext> {
  const supabase = await createSupabase();
  const { data } = (await supabase?.auth.getClaims()) ?? { data: null };
  return contextFromAmr(data?.claims.amr);
}
