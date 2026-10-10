import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import type { RoleOption } from "./components/team-invite-form";

const roleOptionSchema = z.object({ id: z.string(), name: z.string() });

// Οι Ρόλοι πελάτη που μπορεί να δώσει ο συνδεδεμένος στον Πελάτη: η βάση τους φιλτράρει (client_role_choices).
// Ο Χρήστης πελάτη βλέπει μόνο όσους δεν ξεπερνούν τα δικά του Δικαιώματα.
export async function listClientRoleChoices(clientId: string): Promise<RoleOption[]> {
  const supabase = await createSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("client_role_choices", { p_client: clientId });
  if (error) {
    console.error("client_role_choices", error.message);
    return [];
  }
  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows.flatMap((row) => {
    const parsed = roleOptionSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}
