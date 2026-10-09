import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { accessLinkFor } from "./access-link";
import { toLocale } from "./locale";
import { sendEmail, type SendOutcome } from "./send-email";
import { invitationMessage, type EmailMessageBody } from "./templates/auth-messages";
import { proposalLinkMessage, signedCopyMessage, signingCodeMessage } from "./templates/agreement-messages";

// Η ουρά agreement_outbox (ADR 0016): σύνδεσμος πρότασης, κωδικός υπογραφής, αντίγραφο, πρόσκληση Υπογράφοντα.
// Το «client_invite» φτιάχνει την πρόσκληση Χρήστη πελάτη (ή δεν κάνει τίποτα αν ο Υπογράφων είναι ήδη μέλος).

export const agreementRowSchema = z.object({
  id: z.string(),
  kind: z.enum(["proposal_link", "signing_code", "signed_copy", "client_invite"]),
  to_name: z.string(),
  to_email: z.string(),
  locale: z.string(),
  payload: z.record(z.string(), z.unknown()),
  agreement_id: z.string(),
  agreement_title: z.string(),
  manager_name: z.string().nullable(),
});

export type AgreementRow = z.infer<typeof agreementRowSchema>;

export type AgreementDelivery =
  | { status: "skip" }
  | { status: "done"; outcome: SendOutcome; subject: string };

const sendFailed = (error: string): AgreementDelivery => ({
  status: "done",
  outcome: { status: "failed", providerId: "", error },
  subject: "",
});

const textField = (payload: Record<string, unknown>, key: string): string =>
  typeof payload[key] === "string" ? (payload[key] as string) : "";

const targetSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  email: z.string(),
  alreadyMember: z.boolean(),
});

// Ο Υπογράφων: αν είναι ήδη Χρήστης του Πελάτη, τίποτα. Αλλιώς πρόσκληση Πελάτη με Ρόλο «Πλήρης».
async function clientInviteMessage(admin: SupabaseClient, row: AgreementRow, origin: string): Promise<AgreementDelivery | { error: string } | { skip: true }> {
  const { data: rawTarget, error: targetError } = await admin.rpc("client_invite_target", { p_agreement: row.agreement_id });
  if (targetError) return { error: "Ο Υπογράφων δεν διαβάστηκε" };
  const target = targetSchema.safeParse(rawTarget);
  if (!target.success || target.data.alreadyMember) return { skip: true };

  const { data: invitationId, error: inviteError } = await admin.rpc("invitation_create_signatory", { p_agreement: row.agreement_id });
  if (inviteError) return { error: "Η πρόσκληση δεν δημιουργήθηκε" };
  if (!invitationId) return { skip: true };

  const locale = toLocale(row.locale);
  const link = await accessLinkFor(admin, {
    origin,
    email: target.data.email,
    name: target.data.name,
    locale,
    metadata: { kind: "client" },
  });
  if (!link.ok) return { error: link.error };
  const attached = await admin.rpc("invitation_attach_user", { p_id: invitationId, p_user_id: link.userId });
  if (attached.error) return { error: "Η πρόσκληση δεν συνδέθηκε με λογαριασμό" };

  const { data: client } = await admin.from("clients").select("name").eq("id", target.data.clientId).maybeSingle();
  const message: EmailMessageBody = invitationMessage({
    locale,
    origin,
    name: target.data.name,
    link: link.link,
    kind: "client",
    clientName: typeof client?.name === "string" ? client.name : undefined,
  });
  return sendAgreementMail(row, message);
}

async function sendAgreementMail(row: AgreementRow, message: EmailMessageBody): Promise<AgreementDelivery> {
  const outcome = await sendEmail({ to: row.to_email, toName: row.to_name, ...message });
  return { status: "done", outcome, subject: message.subject };
}

function messageForRow(row: AgreementRow, origin: string): EmailMessageBody | null {
  const locale = toLocale(row.locale);
  const base = { locale, origin, name: row.to_name, agreementTitle: row.agreement_title };
  if (row.kind === "proposal_link")
    return proposalLinkMessage({ ...base, token: textField(row.payload, "token") });
  if (row.kind === "signing_code")
    return signingCodeMessage({ ...base, code: textField(row.payload, "code") });
  if (row.kind === "signed_copy")
    return signedCopyMessage({ ...base, managerName: row.manager_name ?? "" });
  return null;
}

// Επιστρέφει «skip» όταν δεν χρειάζεται email (ο Υπογράφων είναι ήδη μέλος), αλλιώς το αποτέλεσμα της αποστολής.
export async function deliverAgreementRow(admin: SupabaseClient, row: AgreementRow, origin: string): Promise<AgreementDelivery> {
  if (row.kind === "client_invite") {
    const result = await clientInviteMessage(admin, row, origin);
    if ("error" in result) return sendFailed(result.error);
    return "skip" in result ? { status: "skip" } : result;
  }
  const message = messageForRow(row, origin);
  if (!message) return sendFailed("Άγνωστο είδος μηνύματος");
  return sendAgreementMail(row, message);
}
