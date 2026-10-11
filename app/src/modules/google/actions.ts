"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, textOf } from "./action-support";
import { deletionFormSchema, rulesFormSchema } from "./schemas";

// Ενέργειες της εφαρμογής με τη συνεδρία του Χρήστη: η βάση ελέγχει το Δικαίωμα μέσα σε κάθε RPC.

const firstIssue = (message?: string): FormState => ({ error: message ?? "Έλεγξε τα πεδία." });

export async function saveGoogleRules(_: FormState, form: FormData): Promise<FormState> {
  const parsed = rulesFormSchema.safeParse({
    newEvent: textOf(form, "newEvent"),
    deleteHours: textOf(form, "deleteHours"),
    writePending: form.get("writePending") === "on",
  });
  if (!parsed.success) return firstIssue(parsed.error.issues[0]?.message);
  const outcome = await callRpc("google_settings_save", {
    p_new_event: parsed.data.newEvent,
    p_delete_hours: parsed.data.deleteHours,
    p_write_pending: parsed.data.writePending,
  });
  return finishWith(outcome, "Οι Κανόνες Google αποθηκεύτηκαν.");
}

// Επαναφορά: ξαναγράφεται στο Google. Επιβεβαίωση: ακύρωση με υποχρεωτικό λόγο (η βάση ελέγχει τον λόγο).
export async function resolveGoogleDeletion(_: FormState, form: FormData): Promise<FormState> {
  const parsed = deletionFormSchema.safeParse({
    filmingId: textOf(form, "filmingId"),
    restore: form.get("restore") === "on",
    reason: textOf(form, "reason"),
  });
  if (!parsed.success) return firstIssue(parsed.error.issues[0]?.message);
  const outcome = await callRpc("google_deletion_resolve", {
    p_filming: parsed.data.filmingId,
    p_restore: parsed.data.restore,
    p_reason: parsed.data.restore ? null : parsed.data.reason,
  });
  const notice = parsed.data.restore
    ? "Το Γύρισμα ξαναγράφεται στο Google."
    : "Η ακύρωση καταχωρήθηκε.";
  return finishWith(outcome, notice);
}

export async function resyncGoogle(): Promise<FormState> {
  const outcome = await callRpc("google_resync_all", {});
  if (!outcome.ok) return outcome.state;
  const count = typeof outcome.data === "number" ? outcome.data : 0;
  return finishWith(outcome, `Μπήκαν ${count} εγγραφές στην ουρά.`);
}
