"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  cancelSchema,
  deliverSchema,
  reopenSchema,
} from "./schemas";

// Μεταβάσεις κατάστασης της Παραγωγής (Π8): κάθε μία είναι ένα RPC της βάσης. Η βάση ελέγχει το Δικαίωμα και την κατάσταση.

export async function deliverProduction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = deliverSchema.safeParse(pick(form, ["productionId", "note"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_deliver", {
    p_production: parsed.data.productionId,
    p_note: parsed.data.note,
  });
  return finishWith(outcome, "Η Παραγωγή παραδόθηκε.");
}

export async function reopenProduction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = reopenSchema.safeParse(pick(form, ["productionId", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_reopen", {
    p_production: parsed.data.productionId,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, "Η Παραγωγή ξανανοίχτηκε.");
}

export async function cancelProduction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = cancelSchema.safeParse(pick(form, ["productionId", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_cancel", {
    p_production: parsed.data.productionId,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, "Η Παραγωγή ακυρώθηκε.");
}
