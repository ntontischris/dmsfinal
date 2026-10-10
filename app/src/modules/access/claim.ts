import type { createSupabase } from "@/lib/supabase/server";

type SupabaseSession = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

// Με κάθε είσοδο: ο Ιδιοκτήτης (πρώτη φορά) και η αποδοχή της πρόσκλησης (αν υπάρχει). Τα σφάλματα μόνο στα logs.
export async function claimOnEntry(supabase: SupabaseSession): Promise<void> {
  const { error: ownerError } = await supabase.rpc("claim_first_owner");
  if (ownerError) console.error("claim_first_owner", ownerError.message);
  const { error: inviteError } = await supabase.rpc("claim_invitation");
  if (inviteError) console.error("claim_invitation", inviteError.message);
}
