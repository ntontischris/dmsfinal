"use server";

import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import {
  UNCONFIGURED,
  callRpc,
  finishWith,
  firstIssue,
  messageOf,
  pick,
  refreshSales,
} from "./action-support";
import {
  assignSchema,
  forecastSchema,
  stageProbabilitySchema,
} from "./schemas";

// Πρόβλεψη (b3) και Υπεύθυνος (b2) μίας Ευκαιρίας: η βάση αποφασίζει ποιος μπορεί.

export async function setForecast(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = forecastSchema.safeParse(
    pick(form, [
      "opportunityId",
      "value",
      "probability",
      "expectedClose",
      "keepValue",
    ]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const outcome = await callRpc("sales_set_forecast", {
    p_opportunity: input.opportunityId,
    p_value: input.value,
    p_probability: input.probability,
    p_expected_close: input.expectedClose,
    p_keep_value: input.keepValue,
  });
  return finishWith(outcome, "Η πρόβλεψη αποθηκεύτηκε.");
}

export async function setOpportunityManager(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = assignSchema.safeParse(
    pick(form, ["opportunityId", "userId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_set_opportunity_manager", {
    p_opportunity: parsed.data.opportunityId,
    p_to: parsed.data.userId,
  });
  return finishWith(outcome, "Ο Υπεύθυνος άλλαξε.");
}

const labelsSchema = z.array(z.object({ label: z.string() }));

// Ρυθμίσεις › Πωλήσεις: η Πιθανότητα που παίρνει κάθε Ευκαιρία του Σταδίου όταν ο Υπεύθυνος δεν γράψει δική του.
// Γράφεται απευθείας με RLS («Διαχειρίζεται Ρυθμίσεις»)· καμία γραμμή = δεν επιτρέπεται.
export async function setStageProbability(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = stageProbabilitySchema.safeParse(
    pick(form, ["id", "probability"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data, error } = await supabase
    .from("sales_stages")
    .update({ probability: parsed.data.probability })
    .eq("id", parsed.data.id)
    .select("label");
  if (error) return { error: messageOf(error) };
  const label = labelsSchema.safeParse(data);
  const first = label.success ? label.data[0]?.label : undefined;
  if (first === undefined)
    return { error: "Δεν έχεις Δικαίωμα για αυτή την αλλαγή." };
  refreshSales();
  return {
    notice: `Το Στάδιο «${first}» έχει πια Πιθανότητα ${parsed.data.probability ?? 0}%.`,
  };
}
