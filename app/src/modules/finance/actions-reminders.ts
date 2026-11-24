"use server";

import { after } from "next/server";
import { z } from "zod";

import { kickOutbox } from "@/lib/email/outbox-trigger";
import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith } from "./action-support";

// Τ4: «Στείλε υπενθύμιση» για ληξιπρόθεσμο Τιμολόγιο. Η βάση ελέγχει Δικαίωμα και κατάσταση και στέλνει μέσω του
// Αυτοματισμού «Ληξιπρόθεσμο» (ίδιοι παραλήπτες, ίδιο κείμενο, ίδια ουρά email).

const SENT_TEXT = "Η υπενθύμιση έφυγε και γράφτηκε στο Ίχνος.";
const BAD_INVOICE_TEXT = "Δεν βρέθηκε το Τιμολόγιο.";

export async function sendInvoiceReminder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: BAD_INVOICE_TEXT };
  const outcome = await callRpc("invoice_reminder_send", { p_id: id.data });
  if (outcome.ok) after(() => kickOutbox());
  return finishWith(outcome, SENT_TEXT);
}
