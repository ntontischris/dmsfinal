"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { PREF_OFF, PREF_ON } from "./automation-labels";
import { prefFormSchema } from "./automation-schemas";

// «Λαμβάνω» ενός Αυτοματισμού για τον εαυτό μου (#173, Α10). Η βάση κλειδώνει τα απαραίτητα για τον πελάτη.
export async function setPref(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = prefFormSchema.safeParse(
    pick(form, ["automationId", "receive"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const receive = parsed.data.receive === "on";
  const outcome = await callRpc("set_notification_pref", {
    p_automation: parsed.data.automationId,
    p_receive: receive,
  });
  return finishWith(outcome, receive ? PREF_ON : PREF_OFF);
}
