"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { crewTemplateRefSchema, crewTemplateSchema } from "./schemas";

// Πρότυπα Συνεργείου (E7): δημιουργία, αλλαγή και διαγραφή. Όλα με filming.crew, η βάση ελέγχει.

export async function saveCrewTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = crewTemplateSchema.safeParse({
    ...pick(form, ["templateId", "name", "note"]),
    userIds: form.getAll("userId").map(String),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { templateId, name, note, userIds } = parsed.data;
  if (templateId === null) {
    const outcome = await callRpc("crew_template_create", {
      p_name: name,
      p_note: note,
      p_user_ids: userIds,
    });
    return finishWith(outcome, "Το Πρότυπο αποθηκεύτηκε.");
  }
  const outcome = await callRpc("crew_template_update", {
    p_id: templateId,
    p_name: name,
    p_note: note,
    p_user_ids: userIds,
  });
  return finishWith(outcome, "Το Πρότυπο ενημερώθηκε.");
}

export async function deleteCrewTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = crewTemplateRefSchema.safeParse(pick(form, ["templateId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("crew_template_delete", {
    p_id: parsed.data.templateId,
  });
  return finishWith(outcome, "Το Πρότυπο διαγράφηκε.");
}
