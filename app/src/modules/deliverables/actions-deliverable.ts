"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { cancelSchema, chargeDecisionSchema, createSchema, updateSchema } from "./schemas";

// Το Παραδοτέο: δημιουργία, επεξεργασία, ακύρωση και απόφαση χρέωσης. Κάθε μία είναι ένα RPC της βάσης.

const CREATE_KEYS = [
  "productionId",
  "kindId",
  "title",
  "assigneeId",
  "filmingId",
  "charge",
  "chargeReason",
] as const;

export async function createDeliverable(_: FormState, form: FormData): Promise<FormState> {
  const parsed = createSchema.safeParse(pick(form, CREATE_KEYS));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_create", {
    p_production: value.productionId,
    p_kind: value.kindId,
    p_title: value.title,
    p_assignee: value.assigneeId,
    p_filming: value.filmingId,
    p_charge: value.charge,
    p_charge_reason: value.chargeReason,
  });
  return finishWith(outcome, "Το Παραδοτέο δημιουργήθηκε.");
}

export async function updateDeliverable(_: FormState, form: FormData): Promise<FormState> {
  const parsed = updateSchema.safeParse(
    pick(form, ["deliverableId", "title", "assigneeId", "filmingId", "deadline"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_update", {
    p_id: value.deliverableId,
    p_title: value.title,
    p_assignee: value.assigneeId,
    p_filming: value.filmingId,
    p_deadline: value.deadline,
  });
  return finishWith(outcome, "Τα στοιχεία αποθηκεύτηκαν.");
}

export async function cancelDeliverable(_: FormState, form: FormData): Promise<FormState> {
  const parsed = cancelSchema.safeParse(pick(form, ["deliverableId", "reason", "outcome"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_cancel", {
    p_id: value.deliverableId,
    p_reason: value.reason,
    p_outcome: value.outcome,
  });
  return finishWith(outcome, "Το Παραδοτέο ακυρώθηκε.");
}

export async function decideDeliverableCharge(_: FormState, form: FormData): Promise<FormState> {
  const parsed = chargeDecisionSchema.safeParse(pick(form, ["deliverableId", "charge", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("deliverable_charge_decide", {
    p_id: value.deliverableId,
    p_charge: value.charge,
    p_reason: value.reason,
  });
  return finishWith(outcome, "Η χρέωση αποφασίστηκε.");
}
