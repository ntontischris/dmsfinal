"use server";

import { revalidatePath } from "next/cache";

import { kickOutbox } from "@/lib/email/outbox-trigger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabase } from "@/lib/supabase/server";

import { requestOrigin } from "./request-origin";
import { provisionMember, rpcMessage, UNCONFIGURED, type Admin, type Supabase } from "./provision";
import { clientInviteSchema, teamInviteSchema, uuidSchema } from "./invitation-schemas";
import type { FormState } from "./schemas";

// Προσκλήσεις (N1 Ομάδα, N2/N3 Χρήστες πελάτη). Η βάση ελέγχει κάθε κανόνα· εδώ γίνεται ο λογαριασμός και το email.

const NO_ADMIN: FormState = { error: "Η σύνδεση για προσκλήσεις δεν έχει ρυθμιστεί ακόμα." };

const firstIssue = (issues: readonly { message: string }[]): FormState => ({ error: issues[0]?.message });

const readRoleIds = (form: FormData): string[] => form.getAll("role").map(String);

const readClientId = (form: FormData): string | null => {
  const parsed = uuidSchema.safeParse(form.get("clientId"));
  return parsed.success ? parsed.data : null;
};

const readLocale = (form: FormData): string => String(form.get("locale") || "el");

async function clientNameOf(admin: Admin, clientId: string): Promise<string> {
  const { data } = await admin.from("clients").select("name").eq("id", clientId).maybeSingle();
  return typeof data?.name === "string" ? data.name : "";
}

function noticeFor(existing: boolean, email: string): FormState {
  return {
    notice: existing
      ? `Ο Χρήστης υπήρχε ήδη. Του στείλαμε σύνδεσμο στο ${email}.`
      : `Η πρόσκληση στάλθηκε στο ${email}. Ισχύει 7 ημέρες.`,
  };
}

async function inviteWith(
  supabase: Supabase,
  admin: Admin,
  call: { fn: string; args: Record<string, unknown>; kind: "team" | "client"; clientId?: string },
  person: { name: string; email: string; locale: string },
): Promise<FormState> {
  const created = await supabase.rpc(call.fn, call.args);
  if (created.error) return { error: rpcMessage(created.error, "Η πρόσκληση δεν δημιουργήθηκε.") };
  const invitationId = String(created.data);
  const clientName = call.clientId ? await clientNameOf(admin, call.clientId) : "";
  const provisioned = await provisionMember(supabase, admin, {
    invitationId,
    kind: call.kind,
    clientId: call.clientId ?? null,
    clientName,
    ...person,
  });
  if (!provisioned.ok) return { error: provisioned.error };
  if (provisioned.enqueued) kickOutbox(await requestOrigin());
  revalidatePath("/app", "layout");
  return noticeFor(provisioned.existing, person.email);
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
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const admin = createAdminClient();
  if (!admin) return NO_ADMIN;
  return inviteWith(
    supabase,
    admin,
    {
      fn: "invitation_create_team",
      kind: "team",
      args: { p_name: parsed.data.name, p_email: parsed.data.email, p_locale: parsed.data.locale, p_role_ids: parsed.data.roleIds },
    },
    parsed.data,
  );
}

// N2/N3: πρόσκληση Χρήστη πελάτη σε Πελάτη, με Ρόλο πελάτη (κενό = «Πλήρης»).
export async function inviteClientUser(_: FormState, form: FormData): Promise<FormState> {
  const clientId = readClientId(form);
  const parsed = clientInviteSchema.safeParse({
    clientId,
    name: form.get("name"),
    email: form.get("email"),
    locale: readLocale(form),
    roleId: form.get("roleId") || undefined,
  });
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const admin = createAdminClient();
  if (!admin) return NO_ADMIN;
  return inviteWith(
    supabase,
    admin,
    {
      fn: "invitation_create_client",
      kind: "client",
      clientId: parsed.data.clientId,
      args: {
        p_client: parsed.data.clientId,
        p_name: parsed.data.name,
        p_email: parsed.data.email,
        p_locale: parsed.data.locale,
        p_role_id: parsed.data.roleId ?? null,
      },
    },
    parsed.data,
  );
}

// Ξανά η πρόσκληση: νέα λήξη 7 ημερών, και το email φεύγει από την ουρά.
export async function resendInvitation(_: FormState, form: FormData): Promise<FormState> {
  const id = uuidSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "Η πρόσκληση δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("invitation_resend", { p_id: id.data });
  if (error) return { error: rpcMessage(error, "Η πρόσκληση δεν στάλθηκε ξανά.") };
  kickOutbox(await requestOrigin());
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
