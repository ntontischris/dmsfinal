import { z } from "zod";

// Ποιους επηρεάζει η αποθήκευση ενός Ρόλου (N4, πρώτο βήμα), όπως το επιστρέφει το public.role_affected_users.

export const roleAffectedSchema = z.object({
  names: z.array(z.string()),
  total: z.number().int().nonnegative(),
  more: z.number().int().nonnegative(),
});

export type RoleAffected = z.infer<typeof roleAffectedSchema>;

// «Επηρεάζει: Άννα, Νίκος και 3 ακόμη.» ή «Κανείς δεν έχει ακόμα αυτόν τον Ρόλο.»
export function affectedText({ names, more }: RoleAffected): string {
  if (names.length === 0) return "Κανείς δεν έχει ακόμα αυτόν τον Ρόλο.";
  const listed = names.join(", ");
  return more > 0 ? `Επηρεάζει: ${listed} και ${more} ακόμη.` : `Επηρεάζει: ${listed}.`;
}
