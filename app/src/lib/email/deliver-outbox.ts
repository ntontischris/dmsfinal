import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { accessLinkFor } from "./access-link";
import { toLocale, type Locale } from "./locale";
import { sendEmail, type SendOutcome } from "./send-email";
import {
  clientAddedMessage,
  decisionMessage,
  testMessage,
  type DecisionInput,
  type DecisionKind,
} from "./templates/system-messages";
import {
  invitationMessage,
  type EmailMessageBody,
} from "./templates/auth-messages";

// Η ουρά email_outbox (ADR 0016): δοκιμή, πρόσκληση ξανά, προσθήκη σε Πελάτη, απόφαση γυρίσματος/μετάθεσης.
// Κάθε είδος φτιάχνει το μήνυμά του, στέλνει, και επιστρέφει το αποτέλεσμα για το email_outbox_done.
// Το kind της ΒΔ πρέπει να υπάρχει εδώ· αλλιώς ολόκληρη η παρτίδα αποτυγχάνει στο σχήμα.

export const outboxRowSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "test",
    "invite_resend",
    "client_added",
    "filming_decision",
    "reschedule_decision",
  ]),
  to_name: z.string(),
  to_email: z.string(),
  locale: z.string(),
  payload: z.record(z.string(), z.unknown()),
  attempts: z.number(),
});

export type OutboxRow = z.infer<typeof outboxRowSchema>;

export interface DeliveryResult {
  outcome: SendOutcome;
  subject: string;
}

const failedResult = (error: string): DeliveryResult => ({
  outcome: { status: "failed", providerId: "", error },
  subject: "",
});

const stringField = (payload: Record<string, unknown>, key: string): string =>
  typeof payload[key] === "string" ? (payload[key] as string) : "";

const invitationSchema = z.object({
  kind: z.enum(["team", "client"]),
  client: z.object({ name: z.string() }).nullable(),
});

// Η πρόσκληση που περιμένει ξανα-αποστολή: το είδος και ο Πελάτης της, από τον πίνακα.
async function readInvitation(admin: SupabaseClient, invitationId: string) {
  const { data, error } = await admin
    .from("invitations")
    .select("kind, client:clients(name)")
    .eq("id", invitationId)
    .maybeSingle();
  if (error) return null;
  const parsed = invitationSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function inviteResendMessage(
  admin: SupabaseClient,
  row: OutboxRow,
  origin: string,
): Promise<EmailMessageBody | string> {
  const invitation = await readInvitation(
    admin,
    stringField(row.payload, "invitationId"),
  );
  if (!invitation) return "Η πρόσκληση δεν βρέθηκε";
  const locale = toLocale(row.locale);
  const link = await accessLinkFor(admin, {
    origin,
    email: row.to_email,
    name: row.to_name,
    locale,
  });
  if (!link.ok) return link.error;
  return invitationMessage({
    locale,
    origin,
    name: row.to_name,
    link: link.link,
    kind: invitation.kind,
    clientName: invitation.client?.name,
  });
}

async function clientAddedMessageFor(
  admin: SupabaseClient,
  row: OutboxRow,
  origin: string,
): Promise<EmailMessageBody | string> {
  const locale: Locale = toLocale(row.locale);
  const link = await accessLinkFor(admin, {
    origin,
    email: row.to_email,
    name: row.to_name,
    locale,
    preferMagic: true,
  });
  if (!link.ok) return link.error;
  return clientAddedMessage({
    locale,
    origin,
    name: row.to_name,
    clientName: stringField(row.payload, "clientName"),
    link: link.link,
  });
}

const isDecisionKind = (kind: OutboxRow["kind"]): kind is DecisionKind =>
  kind === "filming_decision" || kind === "reschedule_decision";

const isIsoInstant = (value: string): boolean =>
  !Number.isNaN(Date.parse(value));

// Το payload γράφεται από τις συναρτήσεις αποφάσεων της ΒΔ (camelCase)· ό,τι δεν ταιριάζει δεν στέλνεται.
const decisionPayloadSchema = z.object({
  filmingId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  startsAt: z.string().refine(isIsoInstant),
  hours: z.number().positive(),
  previousStartsAt: z.string().refine(isIsoInstant).nullish(),
  reason: z.string().nullish(),
});

function parseDecisionInput(
  row: OutboxRow,
  kind: DecisionKind,
  origin: string,
): DecisionInput | null {
  const parsed = decisionPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    kind,
    previousStartsAt: parsed.data.previousStartsAt ?? null,
    reason: parsed.data.reason ?? null,
  };
}

function decisionMessageFor(
  row: OutboxRow,
  kind: DecisionKind,
  origin: string,
): EmailMessageBody | string {
  const input = parseDecisionInput(row, kind, origin);
  return input ? decisionMessage(input) : "Μη έγκυρο περιεχόμενο ειδοποίησης";
}

async function messageFor(
  admin: SupabaseClient,
  row: OutboxRow,
  origin: string,
): Promise<EmailMessageBody | string> {
  if (row.kind === "test")
    return testMessage({ locale: toLocale(row.locale), origin });
  if (row.kind === "invite_resend")
    return inviteResendMessage(admin, row, origin);
  if (isDecisionKind(row.kind))
    return decisionMessageFor(row, row.kind, origin);
  return clientAddedMessageFor(admin, row, origin);
}

// Φτιάχνει και στέλνει ένα μήνυμα της ουράς. Ό,τι αποτύχει γίνεται «failed» με σύντομο λόγο, χωρίς σύνδεσμο.
export async function deliverOutboxRow(
  admin: SupabaseClient,
  row: OutboxRow,
  origin: string,
): Promise<DeliveryResult> {
  const message = await messageFor(admin, row, origin);
  if (typeof message === "string") return failedResult(message);
  const outcome = await sendEmail({
    to: row.to_email,
    toName: row.to_name,
    ...message,
  });
  return { outcome, subject: message.subject };
}
