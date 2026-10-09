import type { AdminClient } from "@/lib/supabase/admin";
import { rpcMessage } from "@/lib/rpc-error";

// Ο λογαριασμός μιας πρόσκλησης (service role): δίνεται ο Χρήστης στην πρόσκληση, και ξεμπλοκάρεται αν υπήρχε ήδη.
// Η συμμετοχή ΔΕΝ δίνεται εδώ· τη δίνει η claim_invitation όταν μπει ο ίδιος ο Χρήστης.
// Κάθε αποτυχία κλείνει την πρόσκληση με το σφάλμα (invitation_fail), ώστε να μη μένει εκκρεμής χωρίς λογαριασμό.

export interface AttachInput {
  invitationId: string;
  userId: string;
  existing: boolean;
}

export type AccountStep = { ok: true } | { ok: false; error: string };

export async function failInvitation(admin: AdminClient, invitationId: string, error: string): Promise<AccountStep> {
  const { error: failError } = await admin.rpc("invitation_fail", { p_id: invitationId, p_error: error });
  if (failError) console.error("invitation_fail", failError.message);
  return { ok: false, error };
}

// Ο Χρήστης που υπάρχει ήδη (π.χ. πρώην Χρήστης πελάτη με ban) ξεμπλοκάρεται. Το ban κόβει τις ανανεώσεις της συνεδρίας.
async function unbanAccount(admin: AdminClient, userId: string): Promise<boolean> {
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) console.error("unban", error.code ?? "άγνωστο");
  return !error;
}

// Το id του λογαριασμού με αυτό το email, ή null. Χωρίς generateLink.
export async function accountIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("auth_user_id_by_email", { p_email: email });
  if (error) console.error("auth_user_id_by_email", error.message);
  return typeof data === "string" ? data : null;
}

export async function attachInvitationAccount(admin: AdminClient, input: AttachInput): Promise<AccountStep> {
  const { error } = await admin.rpc("invitation_attach_user", { p_id: input.invitationId, p_user_id: input.userId });
  if (error) return failInvitation(admin, input.invitationId, rpcMessage(error, "Η πρόσκληση δεν συνδέθηκε."));
  if (input.existing && !(await unbanAccount(admin, input.userId)))
    return failInvitation(admin, input.invitationId, "Ο λογαριασμός δεν ξεμπλοκάρισε. Δοκίμασε ξανά.");
  return { ok: true };
}
