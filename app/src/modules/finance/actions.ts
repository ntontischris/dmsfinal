"use server";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { callRpc, finishWith, firstIssue, messageOf, pick, UNCONFIGURED_TEXT } from "./action-support";
import { parsePreview } from "./view-schema";
import type { ReceiptPreview } from "./types";
import { correctionFormSchema, deleteFormSchema, previewSchema, receiptFormSchema } from "./schemas";

// Εισπράξεις (I4, #150): κάθε αλλαγή είναι ένα RPC της βάσης. Η βάση ελέγχει το Δικαίωμα και τον λόγο.

const RECEIPT_FIELDS = ["clientId", "amount", "receivedOn", "methodId", "note"] as const;
const CORRECTION_FIELDS = ["amount", "receivedOn", "methodId", "note"] as const;
const RECEIPT_SAVED = "Η Είσπραξη καταχωρήθηκε.";
const RECEIPT_CORRECTED = "Η διόρθωση αποθηκεύτηκε.";
const RECEIPT_DELETED = "Η Είσπραξη διαγράφηκε.";

export type PreviewResult = { preview: ReceiptPreview } | { error: string };

export async function registerReceipt(_: FormState, form: FormData): Promise<FormState> {
  const parsed = receiptFormSchema.safeParse(pick(form, RECEIPT_FIELDS));
  if (!parsed.success) return firstIssue(parsed.error);
  const values = parsed.data;
  const outcome = await callRpc("receipt_register", {
    p_client: values.clientId,
    p_received_on: values.receivedOn,
    p_amount: values.amount,
    p_method: values.methodId,
    p_note: values.note,
  });
  return finishWith(outcome, RECEIPT_SAVED);
}

export async function correctReceipt(_: FormState, form: FormData): Promise<FormState> {
  const parsed = correctionFormSchema.safeParse(pick(form, ["id", ...CORRECTION_FIELDS, "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const values = parsed.data;
  const outcome = await callRpc("receipt_correct", {
    p_id: values.id,
    p_received_on: values.receivedOn,
    p_amount: values.amount,
    p_method: values.methodId,
    p_note: values.note,
    p_reason: values.reason,
  });
  return finishWith(outcome, RECEIPT_CORRECTED);
}

export async function deleteReceipt(_: FormState, form: FormData): Promise<FormState> {
  const parsed = deleteFormSchema.safeParse(pick(form, ["id", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("receipt_delete", {
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  return finishWith(outcome, RECEIPT_DELETED);
}

// Προεπισκόπηση «Θα εξοφλήσει» για τη φόρμα. Χωρίς αλλαγή στη βάση.
export async function previewReceipt(input: { clientId: string; amount: string }): Promise<PreviewResult> {
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Έλεγξε τα πεδία." };
  const supabase = await createSupabase();
  if (!supabase) return { error: UNCONFIGURED_TEXT };
  const { data, error } = await supabase.rpc("receipt_preview", {
    p_client: parsed.data.clientId,
    p_amount: parsed.data.amount,
  });
  if (error) return { error: messageOf(error) };
  return { preview: parsePreview(data) };
}
