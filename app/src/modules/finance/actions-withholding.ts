"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { withholdingRateFormSchema, withholdingRateIdSchema } from "./schemas";

// Ποσοστά παρακράτησης (Ρυθμίσεις › Οικονομικά, d6): προσθήκη, αλλαγή, απόσυρση και επαναφορά. Χωρίς διαγραφή.

const RATE_SAVED = "Το ποσοστό αποθηκεύτηκε. Οι παλιές Εισπράξεις κρατούν το ποσό τους.";
const RATE_RETIRED = "Το ποσοστό αποσύρθηκε. Οι παλιές Εισπράξεις το κρατούν.";
const RATE_RESTORED = "Το ποσοστό επανήλθε.";

export async function saveWithholdingRate(_: FormState, form: FormData): Promise<FormState> {
  const parsed = withholdingRateFormSchema.safeParse(pick(form, ["id", "label", "percent"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("withholding_rate_save", {
    p_id: parsed.data.id,
    p_label: parsed.data.label,
    p_percent: parsed.data.percent,
  });
  return finishWith(outcome, RATE_SAVED);
}

export async function retireWithholdingRate(_: FormState, form: FormData): Promise<FormState> {
  const parsed = withholdingRateIdSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  return finishWith(await callRpc("withholding_rate_retire", { p_id: parsed.data.id }), RATE_RETIRED);
}

export async function restoreWithholdingRate(_: FormState, form: FormData): Promise<FormState> {
  const parsed = withholdingRateIdSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  return finishWith(await callRpc("withholding_rate_restore", { p_id: parsed.data.id }), RATE_RESTORED);
}
