"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/form-state";

import { blockedSpan } from "./blocked-form";
import { callRpc, revalidateAppLayout } from "./action-support";
import { blockedDeleteSchema, blockedFormSchema } from "./schemas";

// Κλεισμένος χρόνος (A6): αποθήκευση και διαγραφή. Μετά την επιτυχία η οθόνη γυρνά στην εβδομάδα της μέρας.

const WEEK_OF_DAY = (day: string): string =>
  `/app/calendar?view=week&date=${day}`;

// Τα πεδία της φόρμας ως κείμενο· το «όλη μέρα» είναι checkbox (ΝΑΙ ή τίποτα).
const readBlockedForm = (form: FormData) => ({
  id: String(form.get("id") ?? ""),
  userId: String(form.get("userId") ?? ""),
  day: String(form.get("day") ?? ""),
  untilDay: String(form.get("untilDay") ?? ""),
  allDay: form.get("allDay") === "on",
  from: String(form.get("from") ?? ""),
  to: String(form.get("to") ?? ""),
  title: String(form.get("title") ?? ""),
});

export async function saveBlockedTime(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = blockedFormSchema.safeParse(readBlockedForm(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, userId, day, untilDay, allDay, from, to, title } = parsed.data;
  const span = blockedSpan({ day, untilDay, allDay, from, to });
  const outcome = await callRpc("blocked_time_save", {
    p_id: id,
    p_user: userId,
    p_starts: span.startsAt,
    p_ends: span.endsAt,
    p_all_day: allDay,
    p_title: title,
  });
  if (!outcome.ok) return { error: outcome.error };
  revalidateAppLayout();
  redirect(WEEK_OF_DAY(day));
}

export async function deleteBlockedTime(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = blockedDeleteSchema.safeParse({
    id: String(form.get("id") ?? ""),
    day: String(form.get("day") ?? ""),
  });
  if (!parsed.success) return { error: "Ο κλεισμένος χρόνος δεν βρέθηκε." };
  const outcome = await callRpc("blocked_time_delete", {
    p_id: parsed.data.id,
  });
  if (!outcome.ok) return { error: outcome.error };
  revalidateAppLayout();
  redirect(WEEK_OF_DAY(parsed.data.day));
}
