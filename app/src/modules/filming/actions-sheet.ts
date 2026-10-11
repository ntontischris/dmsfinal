"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue } from "./action-support";
import { sheetIssueSchema, sheetSaveSchema } from "./schemas-sheet";

// Το Δελτίο γυρίσματος: αποθήκευση λήψεων και σημείωσης, έκδοση. Η βάση αποφασίζει· εδώ μόνο φαίνονται και στέλνονται τα πεδία.

export async function saveSheet(_: FormState, form: FormData): Promise<FormState> {
  const parsed = sheetSaveSchema.safeParse({
    filmingId: form.get("filmingId"),
    shots: String(form.get("shots") ?? "[]"),
    crewNote: String(form.get("crewNote") ?? ""),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_sheet_save", {
    p_id: parsed.data.filmingId,
    p_shots: parsed.data.shots,
    p_crew_note: parsed.data.crewNote,
  });
  return finishWith(outcome, "Το Δελτίο αποθηκεύτηκε.");
}

export async function issueSheet(_: FormState, form: FormData): Promise<FormState> {
  const parsed = sheetIssueSchema.safeParse({
    filmingId: form.get("filmingId"),
    change: String(form.get("change") ?? ""),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_sheet_issue", {
    p_id: parsed.data.filmingId,
    p_change: parsed.data.change,
  });
  if (!outcome.ok) return outcome.state;
  return finishWith(outcome, `Εκδόθηκε η έκδοση ${String(outcome.data)} του Δελτίου.`);
}
