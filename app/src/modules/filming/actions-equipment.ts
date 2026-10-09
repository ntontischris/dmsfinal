"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { equipmentNotice } from "./notices";
import {
  equipmentSetSchema,
  equipmentTemplateApplySchema,
  reservationSchema,
} from "./schemas";

// Εξοπλισμός του Γυρίσματος (E3) και Δεσμεύσεις από την F2. Η βάση αποφασίζει σύγκρουση και διαθεσιμότητα.

export async function setFilmingEquipment(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = equipmentSetSchema.safeParse({
    filmingId: form.get("filmingId"),
    itemIds: form.getAll("itemId").map(String),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_equipment_set", {
    p_id: parsed.data.filmingId,
    p_item_ids: parsed.data.itemIds,
  });
  if (!outcome.ok) return outcome.state;
  return finishWith(outcome, equipmentNotice(outcome.data));
}

export async function applyEquipmentTemplate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = equipmentTemplateApplySchema.safeParse(
    pick(form, ["filmingId", "templateId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_equipment_apply_template", {
    p_id: parsed.data.filmingId,
    p_template: parsed.data.templateId,
  });
  if (!outcome.ok) return outcome.state;
  return finishWith(outcome, equipmentNotice(outcome.data));
}

// Δέσμευση από την F2 σε ένα ανοιχτό Γύρισμα. Επιστρέφει αν έγινε σύγκρουση (με προειδοποίηση).
export async function reserveItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = reservationSchema.safeParse(
    pick(form, ["itemId", "filmingId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_item_reserve", {
    p_item: parsed.data.itemId,
    p_filming: parsed.data.filmingId,
  });
  if (!outcome.ok) return outcome.state;
  return finishWith(
    outcome,
    outcome.data === true
      ? "Το αντικείμενο δεσμεύτηκε, με προειδοποίηση σύγκρουσης."
      : "Το αντικείμενο δεσμεύτηκε.",
  );
}

export async function releaseItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = reservationSchema.safeParse(
    pick(form, ["itemId", "filmingId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_item_release", {
    p_item: parsed.data.itemId,
    p_filming: parsed.data.filmingId,
  });
  return finishWith(outcome, "Η δέσμευση αφαιρέθηκε.");
}
