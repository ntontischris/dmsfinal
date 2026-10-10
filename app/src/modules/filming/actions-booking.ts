"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { athensToIso } from "./helpers-time";
import { checkSlot } from "./queries-booking";
import {
  dayRefSchema,
  decideRescheduleSchema,
  exceptionSchema,
  holidayToggleSchema,
  slotCheckSchema,
  bookingHoursSchema,
} from "./schemas-booking";

// Ωράριο, εξαιρέσεις, αργίες (Ρυθμίσεις › Γυρίσματα), απόφαση μετάθεσης (E2) και προειδοποίηση ώρας (E3, E4).
// Κάθε αλλαγή είναι ένα RPC· η βάση ελέγχει Δικαίωμα και τιμές.

const text = (form: FormData, key: string): string => String(form.get(key) ?? "");

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

// Τα πεδία της εβδομάδας έχουν ονόματα open-1, from-1, to-1… (1 = Δευτέρα).
const readWeek = (form: FormData) =>
  WEEK_DAYS.map((dow) => ({
    dow,
    isOpen: form.get(`open-${dow}`) === "on",
    opens: text(form, `from-${dow}`),
    closes: text(form, `to-${dow}`),
  }));

export async function saveBookingHours(_: FormState, form: FormData): Promise<FormState> {
  const parsed = bookingHoursSchema.safeParse({
    week: readWeek(form),
    capacity: Number(text(form, "capacity")),
    durations: form.getAll("durations").map((value) => Number(String(value))),
    stepMinutes: Number(text(form, "stepMinutes")),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("booking_hours_save", { p_settings: parsed.data });
  return finishWith(outcome, "Το Ωράριο αποθηκεύτηκε.");
}

// Εξαίρεση μιας μέρας: κλειστή, ή άλλες ώρες (κενές ώρες = το εβδομαδιαίο Ωράριο της μέρας).
export async function saveBookingException(_: FormState, form: FormData): Promise<FormState> {
  const parsed = exceptionSchema.safeParse({
    day: text(form, "day"),
    isClosed: text(form, "mode") === "closed",
    opens: text(form, "opens"),
    closes: text(form, "closes"),
    capacity: text(form, "capacity") === "" ? null : Number(text(form, "capacity")),
    note: text(form, "note"),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { day, isClosed, opens, closes, capacity, note } = parsed.data;
  const outcome = await callRpc("booking_exception_save", {
    p_day: day,
    p_is_closed: isClosed,
    p_opens: isClosed || opens === "" ? null : opens,
    p_closes: isClosed || closes === "" ? null : closes,
    p_capacity: isClosed ? null : capacity,
    p_note: note,
  });
  return finishWith(outcome, "Η εξαίρεση αποθηκεύτηκε.");
}

export async function deleteBookingException(_: FormState, form: FormData): Promise<FormState> {
  const parsed = dayRefSchema.safeParse(pick(form, ["day"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("booking_exception_delete", { p_day: parsed.data.day });
  return finishWith(outcome, "Η εξαίρεση διαγράφηκε.");
}

// Αργία: «Άνοιγμα» γράφει εξαίρεση ανοιχτής μέρας χωρίς ώρες, «Κλείσιμο» σβήνει την εξαίρεση.
export async function toggleHolidayOpen(_: FormState, form: FormData): Promise<FormState> {
  const parsed = holidayToggleSchema.safeParse({
    day: text(form, "day"),
    open: text(form, "open") === "true",
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { day, open } = parsed.data;
  const outcome = open
    ? await callRpc("booking_exception_save", {
        p_day: day,
        p_is_closed: false,
        p_opens: null,
        p_closes: null,
        p_capacity: null,
        p_note: null,
      })
    : await callRpc("booking_exception_delete", { p_day: day });
  return finishWith(outcome, open ? "Η αργία άνοιξε." : "Η αργία έκλεισε.");
}

export async function decideRescheduleRequest(_: FormState, form: FormData): Promise<FormState> {
  const parsed = decideRescheduleSchema.safeParse({
    filmingId: text(form, "filmingId"),
    accept: text(form, "accept"),
    reason: text(form, "reason"),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, accept, reason } = parsed.data;
  const outcome = await callRpc("filming_decide_reschedule", {
    p_id: filmingId,
    p_accept: accept === "accept",
    p_reason: reason,
  });
  return finishWith(
    outcome,
    accept === "accept" ? "Η μετάθεση εγκρίθηκε." : "Η μετάθεση απορρίφθηκε.",
  );
}

// Προειδοποίηση ώρας για τη φόρμα: δεν μπλοκάρει τίποτα. Χωρίς έγκυρη ώρα ή με σφάλμα βάσης δεν δείχνει τίποτα.
export async function checkSlotWarning(input: {
  date: string;
  time: string;
  hours: string;
  filmingId?: string;
}): Promise<{ problem: string | null }> {
  const parsed = slotCheckSchema.safeParse(input);
  if (!parsed.success) return { problem: null };
  const { date, time, hours, filmingId } = parsed.data;
  const result = await checkSlot(athensToIso(date, time), hours, filmingId ?? null);
  return { problem: result.ok ? result.data.problem : null };
}
