"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  createItemSchema,
  itemRefSchema,
  setStatusSchema,
  updateItemSchema,
} from "./schemas";

// Ενέργειες του μητρώου: κάθε μία είναι ένα RPC της βάσης. Η Δέσμευση δεν είναι εδώ (έρχεται με τα Γυρίσματα).

const ITEM_FIELDS = ["categoryId", "name", "code", "note"] as const;

// Το κενό πεδίο γίνεται null: η βάση δεν αποθηκεύει κενά κείμενα.
const toOptional = (value: string): string | null =>
  value === "" ? null : value;

const CREATE_FIELDS = [...ITEM_FIELDS, "quantity"] as const;

const createNotice = (quantity: number): string =>
  quantity === 1
    ? "Το αντικείμενο προστέθηκε στο μητρώο."
    : `Προστέθηκαν ${quantity} μονάδες στο μητρώο.`;

// Μία ή περισσότερες μονάδες: η βάση γράφει όλες μαζί ή καμία.
export async function createItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createItemSchema.safeParse(pick(form, CREATE_FIELDS));
  if (!parsed.success) return firstIssue(parsed.error);
  const { categoryId, name, code, note, quantity } = parsed.data;
  const outcome = await callRpc("equipment_items_create_many", {
    p_category_id: categoryId,
    p_name: name,
    p_code: toOptional(code),
    p_note: toOptional(note),
    p_quantity: quantity,
  });
  return finishWith(outcome, createNotice(quantity));
}

export async function updateItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateItemSchema.safeParse(
    pick(form, ["itemId", ...ITEM_FIELDS]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { itemId, categoryId, name, code, note } = parsed.data;
  const outcome = await callRpc("equipment_item_update", {
    p_id: itemId,
    p_category_id: categoryId,
    p_name: name,
    p_code: toOptional(code),
    p_note: toOptional(note),
  });
  return finishWith(outcome, "Τα στοιχεία αποθηκεύτηκαν.");
}

export async function setItemStatus(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = setStatusSchema.safeParse(
    pick(form, ["itemId", "status", "note"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { itemId, status, note } = parsed.data;
  const outcome = await callRpc("equipment_item_set_status", {
    p_id: itemId,
    p_status: status,
    p_note: toOptional(note),
  });
  return finishWith(outcome, "Η κατάσταση άλλαξε.");
}

export async function deleteItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = itemRefSchema.safeParse(pick(form, ["itemId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_item_delete", {
    p_id: parsed.data.itemId,
  });
  if (!outcome.ok) return outcome.state;
  redirect("/app/equipment");
}
