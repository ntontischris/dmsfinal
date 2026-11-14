"use server";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import {
  UNCONFIGURED,
  callRpc,
  finishWith,
  firstIssue,
  messageOf,
  pick,
  refreshSales,
} from "./action-support";
import {
  addReminderSchema,
  clientPlaceSchema,
  completeReminderSchema,
} from "./schemas";

// Φροντίδα Πελάτη (b7). Η Διεύθυνση περνά από RPC (ίδιος κανόνας με τα άλλα στοιχεία)· οι υπενθυμίσεις γράφονται
// απευθείας, και η RLS κρατά μόνο τις δικές μου, σε Πελάτη που βλέπω.

export async function updateClientPlace(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = clientPlaceSchema.safeParse(
    pick(form, ["clientId", "address", "filmingLocation"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_update_client_place", {
    p_client: parsed.data.clientId,
    p_address: parsed.data.address,
    p_filming_location: parsed.data.filmingLocation,
  });
  return finishWith(outcome, "Αποθηκεύτηκε.");
}

async function writeReminder(
  write: (
    supabase: NonNullable<Awaited<ReturnType<typeof createSupabase>>>,
  ) => PromiseLike<{ error: { code?: string; message: string } | null }>,
  notice: string,
): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await write(supabase);
  if (error) return { error: messageOf(error) };
  refreshSales();
  return { notice };
}

export async function addReminder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = addReminderSchema.safeParse(
    pick(form, ["clientId", "remindOn", "note"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  return writeReminder(
    (supabase) =>
      supabase.from("client_reminders").insert({
        client_id: input.clientId,
        remind_on: input.remindOn,
        note: input.note,
      }),
    "Θα σου το θυμίσω στο Σήμερα.",
  );
}

export async function completeReminder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = completeReminderSchema.safeParse(pick(form, ["reminderId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  return writeReminder(
    (supabase) =>
      supabase
        .from("client_reminders")
        .update({ done_at: new Date().toISOString() })
        .eq("id", parsed.data.reminderId),
    "Έγινε.",
  );
}
