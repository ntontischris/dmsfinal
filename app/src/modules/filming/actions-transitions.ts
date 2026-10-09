"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  cancelSchema,
  decideCancelSchema,
  doneSchema,
  filmingRefSchema,
  rejectSchema,
  rescheduleSchema,
  undoSchema,
} from "./schemas";

// Μεταβάσεις κατάστασης του Γυρίσματος (E2, E3): κάθε μία είναι ένα RPC της βάσης.

export async function approveFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = filmingRefSchema.safeParse(pick(form, ["filmingId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_approve", { p_id: parsed.data.filmingId });
  return finishWith(outcome, "Το Γύρισμα εγκρίθηκε.");
}

export async function rejectFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = rejectSchema.safeParse(pick(form, ["filmingId", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_reject", {
    p_id: parsed.data.filmingId,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, "Το Γύρισμα απορρίφθηκε.");
}

export async function cancelFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = cancelSchema.safeParse(pick(form, ["filmingId", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_cancel", {
    p_id: parsed.data.filmingId,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, "Το Γύρισμα ακυρώθηκε.");
}

export async function rescheduleFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = rescheduleSchema.safeParse(
    pick(form, ["filmingId", "date", "time", "hours"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, startsAt, hours } = parsed.data;
  const outcome = await callRpc("filming_reschedule", {
    p_id: filmingId,
    p_starts_at: startsAt,
    p_hours: hours,
  });
  return finishWith(outcome, "Το Γύρισμα μετατέθηκε.");
}

export async function markFilmingDone(_: FormState, form: FormData): Promise<FormState> {
  const parsed = doneSchema.safeParse(pick(form, ["filmingId", "actualHours"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_mark_done", {
    p_id: parsed.data.filmingId,
    p_actual_hours: parsed.data.actualHours,
  });
  return finishWith(outcome, "Το Γύρισμα σημειώθηκε «έγινε».");
}

export async function markFilmingNoShow(_: FormState, form: FormData): Promise<FormState> {
  const parsed = filmingRefSchema.safeParse(pick(form, ["filmingId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_mark_no_show", { p_id: parsed.data.filmingId });
  return finishWith(outcome, "Το Γύρισμα σημειώθηκε «δεν έγινε».");
}

export async function undoFilmingOutcome(_: FormState, form: FormData): Promise<FormState> {
  const parsed = undoSchema.safeParse(pick(form, ["filmingId", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_undo_outcome", {
    p_id: parsed.data.filmingId,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, "Το αποτέλεσμα αναιρέθηκε.");
}

// Αίτημα ακύρωσης μετά το Όριο: δεκτό καίει ή επιστρέφει την Παροχή ανάλογα με τον Κανόνα της Συμφωνίας.
export async function decideCancelRequest(_: FormState, form: FormData): Promise<FormState> {
  const parsed = decideCancelSchema.safeParse(pick(form, ["filmingId", "accept", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, accept, reason } = parsed.data;
  const outcome = await callRpc("filming_decide_cancel_request", {
    p_id: filmingId,
    p_accept: accept === "accept",
    p_reason: reason,
  });
  return finishWith(outcome, accept === "accept" ? "Η ακύρωση έγινε δεκτή." : "Το αίτημα απορρίφθηκε.");
}
