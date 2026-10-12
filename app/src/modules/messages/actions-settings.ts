"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { messageSettingsFormSchema } from "./settings-schemas";

// Ρυθμίσεις › Μηνύματα: μία αποθήκευση. Η βάση ελέγχει Δικαίωμα και όρια, και γράφει Ίχνος μόνο αν άλλαξε τιμή.

export async function saveMessageSettings(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = messageSettingsFormSchema.safeParse(
    pick(form, ["editMinutes", "requestOpenDays"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_settings_update", { p: parsed.data });
  return finishWith(outcome, "Οι Ρυθμίσεις αποθηκεύτηκαν.");
}
