import type { createAdminClient } from "@/lib/supabase/admin";
import type { createSupabase } from "@/lib/supabase/server";

import type { FormState } from "./schemas";

// Ό,τι χρειάζεται μια πρόσκληση για να γίνει λογαριασμός: ο Χρήστης (service role), η σύνδεση με την πρόσκληση,
// και το email (μέσω της ουράς όταν ο Χρήστης υπάρχει ήδη). Μη προνομιακός κώδικας· μόνο κοινά βοηθήματα.

export type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
export type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };

// Τα μηνύματα των κανόνων της βάσης (P0001) είναι ήδη γραμμένα για τον Χρήστη.
export function rpcMessage(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την ενέργεια.";
  console.error(fallback, error.message);
  return fallback;
}

export interface ProvisionInput {
  invitationId: string;
  kind: "team" | "client";
  clientId: string | null;
  clientName: string;
  name: string;
  email: string;
  locale: string;
}

export type Provisioned =
  | { ok: true; existing: boolean; enqueued: boolean }
  | { ok: false; error: string };

type AccountResult = { ok: true; userId: string; existing: boolean } | { ok: false; error: string };

const isAlreadyRegistered = (error: { code?: string; status?: number }): boolean =>
  error.code === "email_exists" || error.status === 422;

// Ο Χρήστης που υπάρχει ήδη (π.χ. πρώην Χρήστης πελάτη με ban) ξεμπλοκάρεται και παίρνει νέο email.
async function existingAccount(admin: Admin, email: string): Promise<AccountResult> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const userId = data?.user?.id;
  if (error || !userId) {
    console.error("existingAccount", error?.code ?? "χωρίς χρήστη");
    return { ok: false, error: "Ο λογαριασμός δεν βρέθηκε." };
  }
  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (unbanError) console.error("unban", unbanError.code ?? "άγνωστο");
  return { ok: true, userId, existing: true };
}

async function accountFor(admin: Admin, input: ProvisionInput): Promise<AccountResult> {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { name: input.name, locale: input.locale, kind: input.kind, client_name: input.clientName },
  });
  if (!error && data.user) return { ok: true, userId: data.user.id, existing: false };
  if (error && isAlreadyRegistered(error)) return existingAccount(admin, input.email);
  console.error("inviteUserByEmail", error?.code ?? "άγνωστο");
  return { ok: false, error: "Το email πρόσκλησης δεν στάλθηκε. Δοκίμασε ξανά." };
}

async function cancelWith(supabase: Supabase, invitationId: string, error: string): Promise<Provisioned> {
  const { error: cancelError } = await supabase.rpc("invitation_cancel", { p_id: invitationId });
  if (cancelError) console.error("invitation_cancel", cancelError.message);
  return { ok: false, error };
}

// Ο Χρήστης που υπήρχε ήδη παίρνει email από την ουρά (πρόσκληση ή προσθήκη σε Πελάτη).
async function enqueueForExisting(admin: Admin, input: ProvisionInput): Promise<boolean> {
  const isClient = input.kind === "client";
  const { error } = await admin.rpc("email_outbox_enqueue", {
    p_kind: isClient ? "client_added" : "invite_resend",
    p_to_name: input.name,
    p_to_email: input.email,
    p_locale: input.locale,
    p_payload: isClient ? { clientName: input.clientName } : { invitationId: input.invitationId },
  });
  if (error) console.error("email_outbox_enqueue", error.message);
  return !error;
}

export async function provisionMember(supabase: Supabase, admin: Admin, input: ProvisionInput): Promise<Provisioned> {
  const account = await accountFor(admin, input);
  if (!account.ok) return cancelWith(supabase, input.invitationId, account.error);
  const { error: attachError } = await admin.rpc("invitation_attach_user", {
    p_id: input.invitationId,
    p_user_id: account.userId,
  });
  if (attachError) {
    return cancelWith(supabase, input.invitationId, rpcMessage(attachError, "Η πρόσκληση δεν συνδέθηκε."));
  }
  if (!account.existing) return { ok: true, existing: false, enqueued: false };
  return { ok: true, existing: true, enqueued: await enqueueForExisting(admin, input) };
}
