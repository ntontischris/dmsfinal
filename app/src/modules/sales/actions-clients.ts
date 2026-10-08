"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  requestAccessSchema,
  transferSchema,
  updateClientSchema,
} from "./schemas";

// Ενέργειες Πελατών: κάθε μία είναι ένα RPC της βάσης (sales_*) που αποφασίζει ποιος μπορεί.

const UPDATE_KEYS = [
  "clientId",
  "name",
  "legalName",
  "city",
  "afm",
  "contactName",
  "contactEmail",
  "contactPhone",
];

export async function updateClient(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateClientSchema.safeParse(pick(form, UPDATE_KEYS));
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const outcome = await callRpc("sales_update_client", {
    p_client: input.clientId,
    p_name: input.name,
    p_legal_name: input.legalName,
    p_city: input.city,
    p_afm: input.afm,
    p_contact_name: input.contactName,
    p_contact_email: input.contactEmail,
    p_contact_phone: input.contactPhone,
  });
  return finishWith(outcome, "Αποθηκεύτηκε.");
}

export async function transferClient(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = transferSchema.safeParse(
    pick(form, ["clientId", "userId", "requestId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const outcome = await callRpc("sales_transfer_client", {
    p_client: input.clientId,
    p_to: input.userId,
    p_request: input.requestId === "" ? null : input.requestId,
  });
  return finishWith(
    outcome,
    "Ο Πελάτης πέρασε στον νέο Υπεύθυνο. Οι ανοιχτές Ευκαιρίες του προηγούμενου Υπεύθυνου τον ακολουθούν.",
  );
}

export async function requestAccess(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = requestAccessSchema.safeParse(
    pick(form, ["clientId", "topic", "comment", "sourceId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const outcome = await callRpc("sales_request_access", {
    p_client: input.clientId,
    p_topic: input.topic,
    p_comment: input.comment,
    p_source_id: input.sourceId,
  });
  return finishWith(outcome, "Το αίτημα στάλθηκε στη Διαχείριση.");
}
