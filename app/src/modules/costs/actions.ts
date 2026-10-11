"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { estimateFormSchema, hoursFormSchema } from "./schemas";

// Ώρες, άμεσο κόστος και εκτίμηση (G3, #144): κάθε εγγραφή είναι ένα RPC της βάσης. Η βάση ελέγχει το Δικαίωμα.

const HOURS_SAVED = "Αποθηκεύτηκε.";
const ESTIMATE_SAVED = "Η εκτίμηση αποθηκεύτηκε.";

export async function saveProductionHours(_: FormState, form: FormData): Promise<FormState> {
  const parsed = hoursFormSchema.safeParse(
    pick(form, ["productionId", "shootHours", "editHours", "directCost", "confirmShoot", "confirmEdit"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const values = parsed.data;
  const outcome = await callRpc("production_hours_set", {
    p_production: values.productionId,
    p_shoot_hours: values.shootHours,
    p_edit_hours: values.editHours,
    p_direct_cost: values.directCost,
    p_confirm_shoot: values.confirmShoot,
    p_confirm_edit: values.confirmEdit,
  });
  return finishWith(outcome, HOURS_SAVED);
}

export async function saveProductionEstimate(_: FormState, form: FormData): Promise<FormState> {
  const parsed = estimateFormSchema.safeParse(
    pick(form, ["productionId", "shootHours", "editHours", "directCost"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const values = parsed.data;
  const outcome = await callRpc("production_estimate_set", {
    p_production: values.productionId,
    p_shoot_hours: values.shootHours,
    p_edit_hours: values.editHours,
    p_direct_cost: values.directCost,
  });
  return finishWith(outcome, ESTIMATE_SAVED);
}
