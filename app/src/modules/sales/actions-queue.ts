"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  assignSchema,
  decideAccessSchema,
  mergeSchema,
  resolveDuplicateSchema,
} from "./schemas";

// Ενέργειες των «Χωρίς υπεύθυνο» (B5) και «Πιθανά διπλά» (B6): κάθε μία είναι ένα RPC της βάσης.

const APPROVED_NOTICE =
  "Άνοιξε Ευκαιρία με Υπεύθυνο τον πωλητή που ζήτησε. Ο Πελάτης μένει στον Υπεύθυνό του.";
const REJECTED_NOTICE = "Απορρίφθηκε με σχόλιο.";

export async function assignOpportunity(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = assignSchema.safeParse(
    pick(form, ["opportunityId", "userId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_assign_opportunity", {
    p_opportunity: parsed.data.opportunityId,
    p_to: parsed.data.userId,
  });
  return finishWith(outcome, "Ανατέθηκε.");
}

export async function decideAccessRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = decideAccessSchema.safeParse(
    pick(form, ["requestId", "decision", "comment"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { requestId, decision, comment } = parsed.data;
  const isApproval = decision === "approve";
  const outcome = await callRpc("sales_decide_access", {
    p_request: requestId,
    p_approve: isApproval,
    p_comment: comment,
  });
  return finishWith(outcome, isApproval ? APPROVED_NOTICE : REJECTED_NOTICE);
}

export async function resolveDuplicate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = resolveDuplicateSchema.safeParse(pick(form, ["flagId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_resolve_duplicate", {
    p_flag: parsed.data.flagId,
  });
  return finishWith(
    outcome,
    "Σημειώθηκε «είναι άλλος». Το σήμα έκλεισε, οι Πελάτες μένουν χωριστοί.",
  );
}

export async function mergeClients(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = mergeSchema.safeParse(
    pick(form, ["survivorId", "absorbedId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_merge_clients", {
    p_survivor: parsed.data.survivorId,
    p_absorbed: parsed.data.absorbedId,
  });
  return finishWith(
    outcome,
    "Συγχωνεύθηκαν: ο ενιαίος Πελάτης έχει όλες τις Ευκαιρίες και το ιστορικό και των δύο.",
  );
}
