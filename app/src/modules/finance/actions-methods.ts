"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { methodFormSchema, methodIdSchema } from "./schemas";

// Τρόποι είσπραξης (Ρυθμίσεις › Οικονομικά, #150): προσθήκη, μετονομασία, απόσυρση και επαναφορά. Χωρίς διαγραφή.

const METHOD_SAVED = "Ο τρόπος αποθηκεύτηκε.";
const METHOD_RETIRED = "Ο τρόπος αποσύρθηκε. Οι παλιές Εισπράξεις τον κρατούν.";
const METHOD_RESTORED = "Ο τρόπος επανήλθε.";

export async function saveMethod(_: FormState, form: FormData): Promise<FormState> {
  const parsed = methodFormSchema.safeParse(pick(form, ["id", "label"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("payment_method_save", {
    p_id: parsed.data.id,
    p_label: parsed.data.label,
  });
  return finishWith(outcome, METHOD_SAVED);
}

export async function retireMethod(_: FormState, form: FormData): Promise<FormState> {
  const parsed = methodIdSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("payment_method_retire", { p_id: parsed.data.id });
  return finishWith(outcome, METHOD_RETIRED);
}

export async function restoreMethod(_: FormState, form: FormData): Promise<FormState> {
  const parsed = methodIdSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("payment_method_restore", { p_id: parsed.data.id });
  return finishWith(outcome, METHOD_RESTORED);
}
