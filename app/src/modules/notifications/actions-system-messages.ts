"use server";

import { SYSTEM_DEFAULTS } from "@/lib/email/system-defaults";
import {
  SYSTEM_SPECS,
  isSystemMessageCode,
  type SystemMessageCode,
} from "@/lib/email/system-texts";
import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { SYSTEM_RESET_DONE, SYSTEM_SAVED } from "./automation-labels";
import { systemMessageFormSchema } from "./automation-schemas";

// Ενέργειες της K2 (#173): αποθήκευση και «Επαναφορά» των κειμένων ενός Μηνύματος συστήματος.

const NO_MESSAGE = { error: "Δεν υπάρχει αυτό το Μήνυμα συστήματος" };

// Η φόρμα στέλνει αλλαγές γραμμής \r\n.
const same = (value: string, fallback: string): boolean =>
  value.replace(/\r\n/g, "\n").trim() === fallback.trim();

// Κάθε πεδίο ίσο με το αρχικό του κώδικα (ή κενό) αποθηκεύεται κενό = null: ισχύει το κείμενο του κώδικα, μαζί με τις
// παραλλαγές του (π.χ. η πρόσκληση πελάτη αναφέρει τον Πελάτη). Γράφεται μόνο ό,τι άλλαξε ρητά ο admin.
function textsToSave(
  code: SystemMessageCode,
  typed: {
    subjectEl: string;
    subjectEn: string;
    bodyEl: string;
    bodyEn: string;
  },
) {
  const { subject, body } = SYSTEM_DEFAULTS[code];
  const changed = (value: string, fallback: string): string =>
    same(value, fallback) ? "" : value;
  return {
    code,
    subjectEl: changed(typed.subjectEl, subject.el),
    subjectEn: changed(typed.subjectEn, subject.en),
    bodyEl: changed(typed.bodyEl, body.el),
    bodyEn: changed(typed.bodyEn, body.en),
  };
}

export async function saveSystemMessage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const code = String(form.get("code") ?? "");
  if (!isSystemMessageCode(code)) return NO_MESSAGE;
  const parsed = systemMessageFormSchema(SYSTEM_SPECS[code]).safeParse(
    pick(form, ["code", "subjectEl", "subjectEn", "bodyEl", "bodyEn"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("system_message_save", {
    p: textsToSave(code, parsed.data),
  });
  return finishWith(outcome, SYSTEM_SAVED);
}

export async function resetSystemMessage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const code = String(form.get("code") ?? "");
  if (!isSystemMessageCode(code)) return NO_MESSAGE;
  return finishWith(
    await callRpc("system_message_save", { p: { code } }),
    SYSTEM_RESET_DONE,
  );
}
