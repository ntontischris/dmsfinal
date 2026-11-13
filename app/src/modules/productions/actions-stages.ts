"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  productionStageSchema,
  stageActiveSchema,
  stageMoveSchema,
  stageSaveSchema,
} from "./task-schemas";

// Στάδια Παραγωγής (πίνακας G1): η λίστα θέλει «Ρυθμίσεις», το Στάδιο μιας Παραγωγής όποιον τη γράφει. Αποφασίζει η βάση.

export async function setProductionStage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = productionStageSchema.safeParse(pick(form, ["productionId", "stageId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_set_stage", {
    p_production: parsed.data.productionId,
    p_stage: parsed.data.stageId,
  });
  return finishWith(outcome, "Το Στάδιο άλλαξε.");
}

export async function saveProductionStage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = stageSaveSchema.safeParse(pick(form, ["stageId", "label"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_stage_save", {
    p_id: parsed.data.stageId,
    p_label: parsed.data.label,
  });
  return finishWith(outcome, parsed.data.stageId ? "Το Στάδιο μετονομάστηκε." : "Το Στάδιο προστέθηκε.");
}

export async function moveProductionStage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = stageMoveSchema.safeParse(pick(form, ["stageId", "step"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_stage_move", {
    p_id: parsed.data.stageId,
    p_step: parsed.data.step,
  });
  return finishWith(outcome, "Η σειρά άλλαξε.");
}

export async function setProductionStageActive(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = stageActiveSchema.safeParse(pick(form, ["stageId", "active"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_stage_set_active", {
    p_id: parsed.data.stageId,
    p_active: parsed.data.active,
  });
  return finishWith(outcome, parsed.data.active ? "Το Στάδιο επανήλθε." : "Το Στάδιο αποσύρθηκε.");
}
