"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  correctionFormKeys,
  correctionFormSchema,
  correctionPayload,
  voidFormSchema,
} from "./invoice-corrections-schemas";

// Διόρθωση και ακύρωση καταχώρισης (Iε, #154). Καμία δεν στέλνει email· τα Δικαιώματα τα ελέγχει η βάση.

const CORRECTED_TEXT = "Η διόρθωση αποθηκεύτηκε και γράφτηκε στο Ίχνος.";
const VOIDED_TEXT = "Η καταχώριση ακυρώθηκε.";

export async function correctInvoice(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = correctionFormSchema.safeParse(pick(form, correctionFormKeys));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("invoice_correct", {
    p_id: parsed.data.id,
    p: correctionPayload(parsed.data),
    p_reason: parsed.data.reason === "" ? null : parsed.data.reason,
  });
  return finishWith(outcome, CORRECTED_TEXT);
}

export async function voidInvoice(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = voidFormSchema.safeParse(pick(form, ["id", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("invoice_void", {
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, VOIDED_TEXT);
}
