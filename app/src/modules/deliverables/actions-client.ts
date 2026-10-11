"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  answerSchema,
  clientCommentSchema,
  reportLinkSchema,
  requestChangeSchema,
} from "./client-schemas";

// Οι ενέργειες του Χρήστη πελάτη: απόφαση, σχόλιο, «Το link δεν ανοίγει», αίτημα αλλαγής μετά την έγκριση.

export async function answerDeliverable(_: FormState, form: FormData): Promise<FormState> {
  const parsed = answerSchema.safeParse(pick(form, ["deliverableId", "decision", "note", "confirmFinal"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_client_answer", {
    p_id: value.deliverableId,
    p_approve: value.decision === "approve",
    p_note: value.note,
  });
  return finishWith(
    outcome,
    value.decision === "approve" ? "Η έγκριση καταχωρίστηκε." : "Οι αλλαγές στάλθηκαν στην ομάδα.",
  );
}

export async function commentAsClient(_: FormState, form: FormData): Promise<FormState> {
  const parsed = clientCommentSchema.safeParse(
    pick(form, ["deliverableId", "versionNumber", "body", "atSeconds"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_client_comment", {
    p_id: value.deliverableId,
    p_version: value.versionNumber,
    p_body: value.body,
    p_at_seconds: value.atSeconds,
  });
  return finishWith(outcome, "Το σχόλιο στάλθηκε.");
}

export async function reportBrokenLink(_: FormState, form: FormData): Promise<FormState> {
  const parsed = reportLinkSchema.safeParse(pick(form, ["deliverableId", "versionNumber"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_report_link", {
    p_id: value.deliverableId,
    p_version: value.versionNumber,
  });
  return finishWith(outcome, "Το αναφέραμε στην ομάδα.");
}

export async function requestChangeAfterApproval(_: FormState, form: FormData): Promise<FormState> {
  const parsed = requestChangeSchema.safeParse(pick(form, ["deliverableId", "body"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_request_change", {
    p_id: value.deliverableId,
    p_body: value.body,
  });
  return finishWith(outcome, "Το αίτημά σου στάλθηκε στην ομάδα.");
}
