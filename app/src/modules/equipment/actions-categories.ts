"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  categoryNameSchema,
  categoryRefSchema,
  renameCategorySchema,
} from "./schemas";

// Ενέργειες των Κατηγοριών: κάθε μία είναι ένα RPC της βάσης (η βάση αποφασίζει ποιος μπορεί τι).

export async function createCategory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = categoryNameSchema.safeParse(pick(form, ["name"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_category_create", {
    p_name: parsed.data.name,
  });
  return finishWith(outcome, "Η Κατηγορία προστέθηκε.");
}

export async function renameCategory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = renameCategorySchema.safeParse(
    pick(form, ["categoryId", "name"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_category_rename", {
    p_id: parsed.data.categoryId,
    p_name: parsed.data.name,
  });
  return finishWith(outcome, "Η Κατηγορία μετονομάστηκε.");
}

export async function retireCategory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = categoryRefSchema.safeParse(pick(form, ["categoryId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_category_retire", {
    p_id: parsed.data.categoryId,
  });
  return finishWith(
    outcome,
    "Αποσύρθηκε: δεν δέχεται νέα αντικείμενα. Όσα έχει, μένουν.",
  );
}

export async function restoreCategory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = categoryRefSchema.safeParse(pick(form, ["categoryId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_category_restore", {
    p_id: parsed.data.categoryId,
  });
  return finishWith(outcome, "Η Κατηγορία επαναφέρθηκε.");
}

export async function deleteCategory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = categoryRefSchema.safeParse(pick(form, ["categoryId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_category_delete", {
    p_id: parsed.data.categoryId,
  });
  return finishWith(outcome, "Η Κατηγορία διαγράφηκε.");
}
