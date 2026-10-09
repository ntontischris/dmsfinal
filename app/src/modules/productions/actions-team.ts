"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { memberSchema, transferSchema } from "./schemas";

// Υπεύθυνος και Μέλη (Π5, Π6): κάθε ενέργεια είναι ένα RPC της βάσης.

export async function transferProduction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = transferSchema.safeParse(pick(form, ["productionId", "ownerId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_transfer", {
    p_production: parsed.data.productionId,
    p_owner_id: parsed.data.ownerId,
  });
  return finishWith(outcome, "Ο Υπεύθυνος άλλαξε.");
}

export async function addProductionMember(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = memberSchema.safeParse(pick(form, ["productionId", "userId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_member_add", {
    p_production: parsed.data.productionId,
    p_user_id: parsed.data.userId,
  });
  return finishWith(outcome, "Το Μέλος προστέθηκε.");
}

export async function removeProductionMember(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = memberSchema.safeParse(pick(form, ["productionId", "userId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_member_remove", {
    p_production: parsed.data.productionId,
    p_user_id: parsed.data.userId,
  });
  return finishWith(outcome, "Το Μέλος αφαιρέθηκε.");
}
