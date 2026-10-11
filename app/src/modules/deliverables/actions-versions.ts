"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { deliverableIdSchema, linkFixSchema, returnSchema, versionAddSchema } from "./schemas";

// Οι Εκδόσεις: νέα Έκδοση, στην αποστολή στον πελάτη, επιστροφή, εσωτερική έγκριση και διόρθωση link.

export async function addVersion(_: FormState, form: FormData): Promise<FormState> {
  const parsed = versionAddSchema.safeParse(pick(form, ["deliverableId", "url", "note"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_version_add", {
    p_id: value.deliverableId,
    p_url: value.url,
    p_note: value.note,
  });
  return finishWith(outcome, "Η νέα Έκδοση προστέθηκε.");
}

export async function sendVersion(_: FormState, form: FormData): Promise<FormState> {
  return runWithDeliverableId(form, "deliverable_version_send", "Η Έκδοση στάλθηκε στον πελάτη.");
}

export async function returnVersion(_: FormState, form: FormData): Promise<FormState> {
  const parsed = returnSchema.safeParse(pick(form, ["deliverableId", "note"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("deliverable_version_return", {
    p_id: parsed.data.deliverableId,
    p_note: parsed.data.note,
  });
  return finishWith(outcome, "Η Έκδοση επιστράφηκε.");
}

export async function approveDeliverableInternally(_: FormState, form: FormData): Promise<FormState> {
  return runWithDeliverableId(form, "deliverable_approve_internal", "Το Παραδοτέο εγκρίθηκε.");
}

export async function fixDeliverableLink(_: FormState, form: FormData): Promise<FormState> {
  const parsed = linkFixSchema.safeParse(pick(form, ["deliverableId", "url"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("deliverable_link_fix", {
    p_id: parsed.data.deliverableId,
    p_url: parsed.data.url,
  });
  return finishWith(outcome, "Το link διορθώθηκε.");
}

async function runWithDeliverableId(
  form: FormData,
  rpc: string,
  notice: string,
): Promise<FormState> {
  const parsed = deliverableIdSchema.safeParse(pick(form, ["deliverableId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc(rpc, { p_id: parsed.data.deliverableId });
  return finishWith(outcome, notice);
}
