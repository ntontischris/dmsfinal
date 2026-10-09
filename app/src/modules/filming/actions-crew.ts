"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { crewAppliedNotice } from "./notices";
import {
  crewRespondSchema,
  crewSetSchema,
  crewTemplateRefSchema,
  filmingRefSchema,
} from "./schemas";

// Συνεργείο του Γυρίσματος (E3, E6): ορισμός, εφαρμογή Προτύπου και απάντηση του μέλους.

export async function setFilmingCrew(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = crewSetSchema.safeParse({
    filmingId: form.get("filmingId"),
    userIds: form.getAll("userId").map(String),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_crew_set", {
    p_id: parsed.data.filmingId,
    p_user_ids: parsed.data.userIds,
  });
  return finishWith(outcome, "Το Συνεργείο αποθηκεύτηκε.");
}

export async function applyCrewTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const filming = filmingRefSchema.safeParse(pick(form, ["filmingId"]));
  if (!filming.success) return firstIssue(filming.error);
  const template = crewTemplateRefSchema.safeParse(pick(form, ["templateId"]));
  if (!template.success) return firstIssue(template.error);
  const outcome = await callRpc("filming_crew_apply_template", {
    p_id: filming.data.filmingId,
    p_template: template.data.templateId,
  });
  if (!outcome.ok) return outcome.state;
  return finishWith(outcome, crewAppliedNotice(outcome.data));
}

export async function respondToCrew(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = crewRespondSchema.safeParse(
    pick(form, ["filmingId", "response", "reason"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_crew_respond", {
    p_id: parsed.data.filmingId,
    p_response: parsed.data.response,
    p_reason: parsed.data.reason,
  });
  return finishWith(
    outcome,
    parsed.data.response === "confirmed"
      ? "Η συμμετοχή επιβεβαιώθηκε."
      : "Η απάντησή σου καταγράφηκε.",
  );
}
