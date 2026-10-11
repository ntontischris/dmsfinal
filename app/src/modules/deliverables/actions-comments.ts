"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
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
