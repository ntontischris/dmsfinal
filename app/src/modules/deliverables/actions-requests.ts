"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { finalFilesSchema, requestDecisionSchema } from "./request-schemas";

// Η ομάδα αποφασίζει ένα Αίτημα μετά την έγκριση, και ορίζει τα Τελικά αρχεία μιας εγκεκριμένης Παραγωγής.

export async function decideRequest(_: FormState, form: FormData): Promise<FormState> {
  const parsed = requestDecisionSchema.safeParse(pick(form, ["requestId", "decision", "note"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_request_decide", {
    p_request: value.requestId,
    p_decision: value.decision,
    p_note: value.note,
  });
  return finishWith(outcome, "Η απόφαση αποθηκεύτηκε.");
}

export async function setFinalFiles(_: FormState, form: FormData): Promise<FormState> {
  const parsed = finalFilesSchema.safeParse(pick(form, ["deliverableId", "url"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_final_files_set", {
    p_id: value.deliverableId,
    p_url: value.url,
  });
  return finishWith(outcome, "Τα τελικά αρχεία αποθηκεύτηκαν.");
}
