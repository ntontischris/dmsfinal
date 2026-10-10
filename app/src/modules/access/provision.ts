import { rpcMessage } from "@/lib/rpc-error";
import { attachInvitationAccount, accountIdByEmail, failInvitation, type AccountStep } from "@/lib/email/invitation-account";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { createSupabase } from "@/lib/supabase/server";

import type { FormState } from "./schemas";

// Η πρόσκληση από τις οθόνες: RPC (έλεγχοι και εγγραφή) → λογαριασμός (service role) → σύνδεση με την πρόσκληση.
// Η συμμετοχή μπαίνει μόνο όταν ο ίδιος ο Χρήστης αποδεχτεί (claim_invitation). Σε αποτυχία η πρόσκληση κλείνει.

export type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

export const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
const NO_SERVICE_MESSAGE = "Η σύνδεση για προσκλήσεις δεν έχει ρυθμιστεί ακόμα.";

export interface InviteCall {
  fn: "invitation_create_team" | "invitation_create_client";
  args: Record<string, unknown>;
  kind: "team" | "client";
  clientId: string | null;
  name: string;
  email: string;
  locale: string;
}

export type Provisioned = { ok: true; existing: boolean; enqueued: boolean } | { ok: false; error: string };

const isAlreadyRegistered = (error: { code?: string; status?: number }): boolean =>
  error.code === "email_exists" || error.status === 422;

const clientNameOf = async (admin: AdminClient, clientId: string | null): Promise<string> => {
  if (!clientId) return "";
  const { data } = await admin.from("clients").select("name").eq("id", clientId).maybeSingle();
  return typeof data?.name === "string" ? data.name : "";
};

interface AccountInput {
  invitationId: string;
  kind: "team" | "client";
  clientName: string;
  name: string;
  email: string;
  locale: string;
}

// Νέο email: η Supabase στέλνει την πρόσκληση (μέσω του hook). Υπάρχον: ο λογαριασμός βρίσκεται χωρίς generateLink.
async function accountFor(admin: AdminClient, input: AccountInput): Promise<{ ok: true; userId: string; existing: boolean } | { ok: false; error: string }> {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { name: input.name, locale: input.locale, kind: input.kind, client_name: input.clientName },
  });
  if (!error && data.user) return { ok: true, userId: data.user.id, existing: false };
  if (error && isAlreadyRegistered(error)) {
    const userId = await accountIdByEmail(admin, input.email);
    return userId ? { ok: true, userId, existing: true } : { ok: false, error: "Ο λογαριασμός δεν βρέθηκε." };
  }
  console.error("inviteUserByEmail", error?.code ?? "άγνωστο");
  return { ok: false, error: "Το email πρόσκλησης δεν στάλθηκε. Δοκίμασε ξανά." };
}

// Ο Χρήστης που υπήρχε ήδη παίρνει email από την ουρά (πρόσκληση ή προσθήκη σε Πελάτη).
async function enqueueForExisting(admin: AdminClient, input: AccountInput): Promise<boolean> {
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

const toProvisioned = (step: AccountStep): Provisioned =>
  step.ok ? { ok: true, existing: false, enqueued: false } : { ok: false, error: step.error };

async function provisionAccount(admin: AdminClient, input: AccountInput): Promise<Provisioned> {
  const account = await accountFor(admin, input);
  if (!account.ok) {
    await failInvitation(admin, input.invitationId, account.error);
    return { ok: false, error: account.error };
  }
  const attached = await attachInvitationAccount(admin, {
    invitationId: input.invitationId,
    userId: account.userId,
    existing: account.existing,
  });
  if (!attached.ok) return toProvisioned(attached);
  if (!account.existing) return { ok: true, existing: false, enqueued: false };
  return { ok: true, existing: true, enqueued: await enqueueForExisting(admin, input) };
}

// Η πλήρης ροή μιας πρόσκλησης από τις οθόνες. Χωρίς service role δεν δημιουργείται τίποτα.
export async function inviteMember(supabase: Supabase, call: InviteCall): Promise<Provisioned> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: NO_SERVICE_MESSAGE };
  const created = await supabase.rpc(call.fn, call.args);
  if (created.error) return { ok: false, error: rpcMessage(created.error, "Η πρόσκληση δεν δημιουργήθηκε.") };
  return provisionAccount(admin, {
    invitationId: String(created.data),
    kind: call.kind,
    clientName: await clientNameOf(admin, call.clientId),
    name: call.name,
    email: call.email,
    locale: call.locale,
  });
}
