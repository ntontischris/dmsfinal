"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import {
  callRpc,
  finishWith,
  firstIssue,
  pick,
  pickPresent,
  refreshCatalogue,
} from "./action-support";
import {
  createItemSchema,
  itemRefSchema,
  setCostSchema,
  setProvisionsSchema,
  setPublicSchema,
  updateItemSchema,
} from "./schemas";
import type { NewItemType, Provision } from "./types";

// Ενέργειες του Καταλόγου: κάθε μία είναι ένα RPC της βάσης (η βάση αποφασίζει ποιος μπορεί τι).

const SAVED_FORWARD =
  "Αποθηκεύτηκε. Ισχύει για νέες προτάσεις· οι υπογεγραμμένες Συμφωνίες κρατούν το δικό τους αντίγραφο.";
const SAVED = "Αποθηκεύτηκε.";
const RETIRED =
  "Αρχειοθετήθηκε: δεν προσφέρεται πια σε νέες προτάσεις και δεν φαίνεται στην Ιστοσελίδα.";
const RESTORED =
  "Επαναφέρθηκε: προσφέρεται ξανά σε νέες προτάσεις. Δεν είναι δημόσιο· το σημειώνεις ξανά αν χρειάζεται.";
const NOT_SAVED = "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";

const KIND_OF_TYPE: Readonly<
  Record<NewItemType, { kind: "package" | "service"; billing: string | null }>
> = {
  package_monthly: { kind: "package", billing: "monthly" },
  package_one_off: { kind: "package", billing: "one_off" },
  service: { kind: "service", billing: null },
};

const toRpcProvisions = (provisions: readonly Provision[]) =>
  provisions.map((p) => ({ kind_id: p.kindId, quantity: p.quantity }));

export async function createItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createItemSchema.safeParse({
    ...pick(form, ["type", "name", "description", "unit", "provisions"]),
    ...pickPresent(form, ["price"]),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { type, name, description, unit, price, provisions } = parsed.data;
  const { kind, billing } = KIND_OF_TYPE[type];
  const outcome = await callRpc("catalogue_create_item", {
    p_kind: kind,
    p_billing: billing,
    p_name: name,
    p_description: description,
    p_unit: kind === "service" ? unit : null,
    p_price: price ?? null,
    p_provisions: toRpcProvisions(provisions),
  });
  if (!outcome.ok) return outcome.state;

  const id = z.uuid().safeParse(outcome.data);
  if (!id.success) return { error: NOT_SAVED };
  refreshCatalogue();
  redirect(`/app/catalogue/${id.data}`);
}

export async function updateItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateItemSchema.safeParse({
    ...pick(form, ["itemId", "name", "description", "unit"]),
    ...pickPresent(form, ["price"]),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { itemId, name, description, unit, price } = parsed.data;
  const outcome = await callRpc("catalogue_update_item", {
    p_item: itemId,
    p_name: name,
    p_description: description,
    p_unit: unit,
    p_price: price ?? null,
  });
  return finishWith(outcome, SAVED_FORWARD);
}

export async function setProvisions(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = setProvisionsSchema.safeParse(
    pick(form, ["itemId", "provisions"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("catalogue_set_provisions", {
    p_item: parsed.data.itemId,
    p_provisions: toRpcProvisions(parsed.data.provisions),
  });
  return finishWith(outcome, SAVED_FORWARD);
}

// Μόνο τα πεδία που υπάρχουν στη φόρμα φτάνουν στη βάση· τα υπόλοιπα μένουν όπως είναι (null).
export async function setCost(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = setCostSchema.safeParse({
    ...pick(form, ["itemId"]),
    ...pickPresent(form, [
      "hoursShoot",
      "hoursEdit",
      "directCost",
      "directCostNote",
    ]),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const data = parsed.data;
  const outcome = await callRpc("catalogue_set_cost", {
    p_item: data.itemId,
    p_hours_shoot: data.hoursShoot ?? null,
    p_hours_edit: data.hoursEdit ?? null,
    p_direct_cost: data.directCost ?? null,
    p_direct_cost_note: data.directCostNote ?? null,
  });
  return finishWith(outcome, SAVED_FORWARD);
}

export async function setPublic(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = setPublicSchema.safeParse({
    ...pick(form, [
      "itemId",
      "nameEn",
      "descriptionPublic",
      "descriptionPublicEn",
    ]),
    ...pickPresent(form, ["isPublic", "showsPrice"]),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const data = parsed.data;
  const outcome = await callRpc("catalogue_set_public", {
    p_item: data.itemId,
    p_is_public: data.isPublic,
    p_shows_price: data.showsPrice,
    p_name_en: data.nameEn,
    p_description_public: data.descriptionPublic,
    p_description_public_en: data.descriptionPublicEn,
  });
  return finishWith(outcome, SAVED);
}

export async function retireItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = itemRefSchema.safeParse(pick(form, ["itemId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("catalogue_retire_item", {
    p_item: parsed.data.itemId,
  });
  return finishWith(outcome, RETIRED);
}

export async function restoreItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = itemRefSchema.safeParse(pick(form, ["itemId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("catalogue_restore_item", {
    p_item: parsed.data.itemId,
  });
  return finishWith(outcome, RESTORED);
}
