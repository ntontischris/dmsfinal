"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import { callRpc, firstIssue, pick, revalidateAppLayout } from "./action-support";
import { bookSchema, internalBookSchema } from "./schemas";

// Κλείσιμο Γυρίσματος από την ομάδα (E4). Η βάση ελέγχει Δικαίωμα, Συμφωνία, Περίοδο και Παροχές.
// Μετά την επιτυχία η οθόνη πηγαίνει στο νέο Γύρισμα (E3)· το μήνυμα δεν θα έμενε μετά την ανανέωση.

const BOOK_FAILED = "Το Γύρισμα δεν αποθηκεύτηκε. Δοκίμασε ξανά.";

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
  if (!outcome.ok) return outcome.state;
  return redirectToFilming(outcome.data);
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
  if (!outcome.ok) return outcome.state;
  return redirectToFilming(outcome.data);
}

// Το redirect πετάει εξαίρεση, γι' αυτό μπαίνει εκτός try· το id έρχεται από τη βάση και ελέγχεται πρώτα.
function redirectToFilming(data: unknown): FormState {
  const id = z.uuid().safeParse(data);
  if (!id.success) return { error: BOOK_FAILED };
  revalidateAppLayout();
  redirect(`/app/filming/${id.data}`);
}
