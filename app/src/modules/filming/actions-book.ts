"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick, revalidateAppLayout } from "./action-support";
import { bookSchema, filmingRefSchema, internalBookSchema, rescheduleSchema } from "./schemas";

// Κλείσιμο Γυρίσματος από την ομάδα (E4). Η βάση ελέγχει Δικαίωμα, Συμφωνία, Περίοδο και Παροχές.
// Μετά την επιτυχία η οθόνη πηγαίνει στο νέο Γύρισμα (E3)· το μήνυμα δεν θα έμενε μετά την ανανέωση.

const BOOK_FAILED = "Το Γύρισμα δεν αποθηκεύτηκε. Δοκίμασε ξανά.";

export async function bookFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = bookSchema.safeParse(
    pick(form, ["agreementId", "date", "time", "hours", "kindId", "location", "note", "fromBlocked"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { agreementId, startsAt, hours, kindId, location, note, fromBlocked } = parsed.data;
  const outcome = await callRpc("filming_create", {
    p_agreement: agreementId,
    p_starts_at: startsAt,
    p_hours: hours,
    p_kind: kindId,
    p_location: location,
    p_note: note,
    p_from_blocked: fromBlocked ?? null,
  });
  if (!outcome.ok) return outcome.state;
  return redirectToFilming(outcome.data);
}

// Κράτηση από τον Πελάτη (E5, c.book). Η βάση ελέγχει Ωράριο, Χωρητικότητα, Παροχή και Συμφωνία· αν η Συμφωνία θέλει έγκριση μένει «αναμένει».
export async function bookClientFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = bookSchema.safeParse(
    pick(form, ["agreementId", "date", "time", "hours", "kindId", "location", "note"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { agreementId, startsAt, hours, kindId, location, note } = parsed.data;
  const outcome = await callRpc("filming_book", {
    p_agreement: agreementId,
    p_starts_at: startsAt,
    p_hours: hours,
    p_kind: kindId,
    p_location: location,
    p_note: note,
  });
  if (!outcome.ok) return outcome.state;
  return redirectToFilming(outcome.data, "booked");
}

// Μετάθεση από τον Πελάτη (c.book)· με Κανόνα επανέγκρισης γράφεται αίτημα, αλλιώς μετακινείται αμέσως.
export async function rescheduleClientFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = rescheduleSchema.safeParse(pick(form, ["filmingId", "date", "time", "hours"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, startsAt, hours } = parsed.data;
  const outcome = await callRpc("filming_client_reschedule", {
    p_id: filmingId,
    p_starts_at: startsAt,
    p_hours: hours,
  });
  if (!outcome.ok) return outcome.state;
  return redirectToFilming(filmingId, "rescheduled");
}

// Ο Πελάτης αποσύρει το αίτημα μετάθεσης· το Γύρισμα μένει στην παλιά ώρα.
export async function withdrawRescheduleRequest(_: FormState, form: FormData): Promise<FormState> {
  const parsed = filmingRefSchema.safeParse(pick(form, ["filmingId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_client_reschedule_withdraw", { p_id: parsed.data.filmingId });
  return finishWith(outcome, "Το αίτημα μετάθεσης αποσύρθηκε.");
}

// Γύρισμα της Εσωτερικής Παραγωγής: χωρίς Πελάτη και χωρίς Παροχή (μόνο για Εύρος «όλα»).
export async function bookInternalFilming(_: FormState, form: FormData): Promise<FormState> {
  const parsed = internalBookSchema.safeParse(
    pick(form, ["productionId", "date", "time", "hours", "location", "note", "fromBlocked"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { productionId, startsAt, hours, location, note, fromBlocked } = parsed.data;
  const outcome = await callRpc("filming_create_internal", {
    p_production: productionId,
    p_starts_at: startsAt,
    p_hours: hours,
    p_location: location,
    p_note: note,
    p_from_blocked: fromBlocked ?? null,
  });
  if (!outcome.ok) return outcome.state;
  return redirectToFilming(outcome.data);
}

// Το redirect πετάει εξαίρεση, γι' αυτό μπαίνει εκτός try· το id έρχεται από τη βάση και ελέγχεται πρώτα.
// Το «done» λέει στο E3 τι έγινε, για το μήνυμα μετά το redirect (η κατάσταση δείχνει αν μπήκε σε έγκριση).
function redirectToFilming(data: unknown, done?: "booked" | "rescheduled"): FormState {
  const id = z.uuid().safeParse(data);
  if (!id.success) return { error: BOOK_FAILED };
  revalidateAppLayout();
  redirect(done ? `/app/filming/${id.data}?done=${done}` : `/app/filming/${id.data}`);
}
