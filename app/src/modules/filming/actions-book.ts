"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { bookSchema, internalBookSchema } from "./schemas";

// Κλείσιμο Γυρίσματος από την ομάδα (E4). Η βάση ελέγχει Δικαίωμα, Συμφωνία, Περίοδο και Παροχές.

export async function bookFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = bookSchema.safeParse(
    pick(form, ["agreementId", "date", "time", "hours", "kindId", "location", "note"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { agreementId, startsAt, hours, kindId, location, note } = parsed.data;
  const outcome = await callRpc("filming_create", {
    p_agreement: agreementId,
    p_starts_at: startsAt,
    p_hours: hours,
    p_kind: kindId,
    p_location: location,
    p_note: note,
  });
  return finishWith(outcome, "Το Γύρισμα κλείστηκε.");
}

// Γύρισμα της Εσωτερικής Παραγωγής: χωρίς Πελάτη και χωρίς Παροχή (μόνο για Εύρος «όλα»).
export async function bookInternalFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = internalBookSchema.safeParse(
    pick(form, ["productionId", "date", "time", "hours", "location", "note"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { productionId, startsAt, hours, location, note } = parsed.data;
  const outcome = await callRpc("filming_create_internal", {
    p_production: productionId,
    p_starts_at: startsAt,
    p_hours: hours,
    p_location: location,
    p_note: note,
  });
  return finishWith(outcome, "Το Γύρισμα της Εσωτερικής Παραγωγής κλείστηκε.");
}
