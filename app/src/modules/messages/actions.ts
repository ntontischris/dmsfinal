"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { removeFiles } from "./message-storage";
import { deleteSchema, deletedSchema, editSchema, sendSchema, tagSchema } from "./schemas";

// Μηνύματα (J2): κάθε ενέργεια είναι ένα RPC της βάσης. Η βάση ελέγχει Δικαίωμα, ορατότητα και παράθυρο διόρθωσης.

const SENT = "Το Μήνυμα στάλθηκε.";
const EDITED = "Η διόρθωση αποθηκεύτηκε.";
const DELETED = "Το Μήνυμα διαγράφηκε.";
const TAGGED = "Η ετικέτα άλλαξε.";

const removedPathsOf = (data: unknown): string[] => {
  const parsed = deletedSchema.safeParse(data);
  return parsed.success ? parsed.data.removedPaths : [];
};

export async function sendMessage(_: FormState, form: FormData): Promise<FormState> {
  const fields = pick(form, ["clientId", "productionId", "body"]);
  const parsed = sendSchema.safeParse({
    ...fields,
    internal: form.get("internal") === "on",
    mentions: form.getAll("mentions").map(String),
    attachments: form.getAll("attachments").map(String),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("message_send", {
    p: {
      clientId: value.clientId,
      productionId: value.productionId,
      body: value.body,
      internal: value.internal,
      mentions: value.mentions,
      attachments: value.attachments,
    },
  });
  return finishWith(outcome, SENT);
}

export async function editMessage(_: FormState, form: FormData): Promise<FormState> {
  const parsed = editSchema.safeParse(pick(form, ["id", "body"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_edit", { p_id: parsed.data.id, p_body: parsed.data.body });
  return finishWith(outcome, EDITED);
}

export async function deleteMessage(_: FormState, form: FormData): Promise<FormState> {
  const parsed = deleteSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_delete", { p_id: parsed.data.id });
  // Τα αρχεία σβήνονται μόνο αφού πετύχει το RPC (το Μήνυμα έχει ήδη διαγραφεί).
  if (outcome.ok) await removeFiles(removedPathsOf(outcome.data));
  return finishWith(outcome, DELETED);
}

export async function setMessageTag(_: FormState, form: FormData): Promise<FormState> {
  const parsed = tagSchema.safeParse(pick(form, ["id", "productionId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_set_tag", {
    p_id: parsed.data.id,
    p_production: parsed.data.productionId,
  });
  return finishWith(outcome, TAGGED);
}
