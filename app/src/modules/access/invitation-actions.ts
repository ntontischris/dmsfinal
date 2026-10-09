"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { rpcMessage } from "@/lib/rpc-error";
import { kickOutbox } from "@/lib/email/outbox-trigger";
import { createSupabase } from "@/lib/supabase/server";

import { inviteMember, UNCONFIGURED, type Provisioned, type InviteCall } from "./provision";
import { clientInviteSchema, teamInviteSchema, uuidSchema } from "./invitation-schemas";
import type { FormState } from "./schemas";

// Προσκλήσεις (N1 Ομάδα, N2/N3 Χρήστες πελάτη). Η βάση ελέγχει κάθε κανόνα· εδώ γίνεται ο λογαριασμός και το email.

const firstIssue = (issues: readonly { message: string }[]): FormState => ({ error: issues[0]?.message });

const readRoleIds = (form: FormData): string[] => form.getAll("role").map(String);

const readClientId = (form: FormData): string | null => {
  const parsed = uuidSchema.safeParse(form.get("clientId"));
  return parsed.success ? parsed.data : null;
};

const readLocale = (form: FormData): string => String(form.get("locale") || "el");

function noticeFor(provisioned: Extract<Provisioned, { ok: true }>, email: string): FormState {
  return {
    notice: provisioned.existing
      ? `Ο Χρήστης υπήρχε ήδη. Του στείλαμε σύνδεσμο στο ${email}.`
      : `Η πρόσκληση στάλθηκε στο ${email}. Ισχύει 7 ημέρες.`,
  };
}

async function inviteWith(call: InviteCall): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const provisioned = await inviteMember(supabase, call);
  if (!provisioned.ok) return { error: provisioned.error };
  if (provisioned.enqueued) after(() => kickOutbox());
  revalidatePath("/app", "layout");
  return noticeFor(provisioned, call.email);
}

// N1: πρόσκληση Χρήστη ομάδας με έναν ή περισσότερους Ρόλους.
export async function inviteTeamUser(_: FormState, form: FormData): Promise<FormState> {
  const parsed = teamInviteSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    locale: readLocale(form),
    roleIds: readRoleIds(form),
  });
  if (!parsed.success) return firstIssue(parsed.error.issues);
  return inviteWith({
    fn: "invitation_create_team",
    kind: "team",
    clientId: null,
    name: parsed.data.name,
    email: parsed.data.email,
    locale: parsed.data.locale,
    args: { p_name: parsed.data.name, p_email: parsed.data.email, p_locale: parsed.data.locale, p_role_ids: parsed.data.roleIds },
  });
}

// N2/N3: πρόσκληση Χρήστη πελάτη σε Πελάτη, με Ρόλο πελάτη (κενό = «Πλήρης»).
export async function inviteClientUser(_: FormState, form: FormData): Promise<FormState> {
  const parsed = clientInviteSchema.safeParse({
    clientId: readClientId(form),
    name: form.get("name"),
    email: form.get("email"),
    locale: readLocale(form),
    roleId: form.get("roleId") || undefined,
  });
  if (!parsed.success) return firstIssue(parsed.error.issues);
  return inviteWith({
    fn: "invitation_create_client",
    kind: "client",
    clientId: parsed.data.clientId,
    name: parsed.data.name,
    email: parsed.data.email,
    locale: parsed.data.locale,
    args: {
      p_client: parsed.data.clientId,
      p_name: parsed.data.name,
      p_email: parsed.data.email,
      p_locale: parsed.data.locale,
      p_role_id: parsed.data.roleId ?? null,
    },
  });
}

// Ξανά η πρόσκληση: νέα λήξη 7 ημερών, και το email φεύγει από την ουρά.
export async function resendInvitation(_: FormState, form: FormData): Promise<FormState> {
  const id = uuidSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "Η πρόσκληση δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("invitation_resend", { p_id: id.data });
  if (error) return { error: rpcMessage(error, "Η πρόσκληση δεν στάλθηκε ξανά.") };
  after(() => kickOutbox());
  revalidatePath("/app", "layout");
  return { notice: "Η πρόσκληση στάλθηκε ξανά. Ισχύει 7 ημέρες." };
}

export async function cancelInvitation(_: FormState, form: FormData): Promise<FormState> {
  const id = uuidSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "Η πρόσκληση δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("invitation_cancel", { p_id: id.data });
  if (error) return { error: rpcMessage(error, "Η πρόσκληση δεν ακυρώθηκε.") };
  revalidatePath("/app", "layout");
  return { notice: "Η πρόσκληση ακυρώθηκε." };
}
