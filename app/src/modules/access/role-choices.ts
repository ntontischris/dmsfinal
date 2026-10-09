import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

import type { RoleOption } from "./components/team-invite-form";
import type { Grants } from "./permissions";

// Οι Ρόλοι πελάτη που μπορεί να δώσει ο συνδεδεμένος. Ο πίνακας των Ρόλων δεν φαίνεται σε Χρήστη πελάτη (RLS),
// γι' αυτό διαβάζεται με service role, και φιλτράρεται εδώ με τον κανόνα της βάσης: κανένα Δικαίωμα πέρα από τα δικά του.

const roleRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  role_permissions: z.array(z.object({ permission: z.string() })),
});

const roleRowsSchema = z.array(roleRowSchema);

// Όλοι οι Ρόλοι (ομάδα) ή μόνο όσοι καλύπτονται από τα Δικαιώματα `mine` (Χρήστης πελάτη).
export async function listClientRoleChoices(mine: Grants | null): Promise<RoleOption[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("roles")
    .select("id, name, role_permissions(permission)")
    .eq("kind", "client")
    .order("name");
  if (error) {
    console.error("listClientRoleChoices", error.message);
    return [];
  }
  const parsed = roleRowsSchema.safeParse(data ?? []);
  if (!parsed.success) return [];
  return parsed.data
    .filter((role) => mine === null || role.role_permissions.every((row) => mine[row.permission] !== undefined))
    .map(({ id, name }) => ({ id, name }));
}
