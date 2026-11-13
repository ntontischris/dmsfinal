"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { replySchema, resolveSchema, seenSchema } from "./note-schemas";
import { commentSchema } from "./schemas";

// Σχόλιο σε μια Έκδοση, με προαιρετικό χρόνο mm:ss (σε δευτερόλεπτα) και σήμα «εσωτερικό».

export async function addComment(_: FormState, form: FormData): Promise<FormState> {
  const parsed = commentSchema.safeParse(
    pick(form, ["deliverableId", "versionNumber", "body", "atSeconds", "isInternal"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_comment_add", {
    p_id: value.deliverableId,
    p_version: value.versionNumber,
    p_body: value.body,
    p_at_seconds: value.atSeconds,
    p_internal: value.isInternal,
  });
  return finishWith(outcome, "Το σχόλιο προστέθηκε.");
}

// Απάντηση της ομάδας σε σημείωση. Σε εσωτερική σημείωση η απάντηση μένει εσωτερική (το κρατά η βάση).
export async function replyToComment(_: FormState, form: FormData): Promise<FormState> {
  const parsed = replySchema.safeParse(pick(form, ["parentId", "body", "isInternal"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("deliverable_comment_reply", {
    p_parent: parsed.data.parentId,
    p_body: parsed.data.body,
    p_internal: parsed.data.isInternal,
  });
  return finishWith(outcome, "Η απάντηση προστέθηκε.");
}

export async function resolveComment(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resolveSchema.safeParse(pick(form, ["commentId", "resolved"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("deliverable_comment_resolve", {
    p_comment: parsed.data.commentId,
    p_resolved: parsed.data.resolved,
  });
  return finishWith(outcome, parsed.data.resolved ? "Σημειώθηκε ως λυμένο." : "Η σημείωση ξανάνοιξε.");
}

// «Το είδε»: γράφεται όταν ανοίγει η Έκδοση. Δεν φρεσκάρει την οθόνη (ο ίδιος δεν χρειάζεται να το δει).
export async function markCommentsSeen(deliverableId: string, versionNumber: number): Promise<void> {
  const parsed = seenSchema.safeParse({ deliverableId, versionNumber });
  if (!parsed.success) return;
  await callRpc("deliverable_comments_seen", { p_id: deliverableId, p_version: versionNumber });
}
