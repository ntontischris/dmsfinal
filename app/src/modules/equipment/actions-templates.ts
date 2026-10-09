"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  createTemplateSchema,
  formItemIds,
  templateRefSchema,
  updateTemplateSchema,
} from "./schemas";

// Ενέργειες των Προτύπων: κάθε μία είναι ένα RPC της βάσης. Το Πρότυπο δεν δεσμεύει τίποτα μόνο του.

export async function createTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createTemplateSchema.safeParse({
    ...pick(form, ["name", "note"]),
    itemIds: formItemIds(form),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_template_create", {
    p_name: parsed.data.name,
    p_note: parsed.data.note,
    p_item_ids: parsed.data.itemIds,
  });
  return finishWith(outcome, "Το Πρότυπο αποθηκεύτηκε.");
}

export async function updateTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateTemplateSchema.safeParse({
    ...pick(form, ["templateId", "name", "note"]),
    itemIds: formItemIds(form),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { templateId, name, note, itemIds } = parsed.data;
  const outcome = await callRpc("equipment_template_update", {
    p_id: templateId,
    p_name: name,
    p_note: note,
    p_item_ids: itemIds,
  });
  return finishWith(outcome, "Το Πρότυπο αποθηκεύτηκε.");
}

export async function deleteTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = templateRefSchema.safeParse(pick(form, ["templateId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_template_delete", {
    p_id: parsed.data.templateId,
  });
  return finishWith(
    outcome,
    "Το Πρότυπο διαγράφηκε. Τα Γυρίσματα που το χρησιμοποίησαν δεν αλλάζουν.",
  );
}
