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

// Όλα ίδια με τα αρχικά = «Επαναφορά» (null). Αλλιώς τα ελληνικά ίδια με τα αρχικά μένουν null (το κείμενο του κώδικα),
// ενώ τα αγγλικά γράφονται όπως είναι, ώστε ο αγγλόφωνος να μην πάρει ελληνικά επειδή άλλαξε μόνο το ελληνικό.
function textsToSave(
  code: SystemMessageCode,
  typed: {
    subjectEl: string;
    subjectEn: string;
    bodyEl: string;
    bodyEn: string;
  },
) {
  const defaults = SYSTEM_DEFAULTS[code];
  const isDefault =
    same(typed.subjectEl, defaults.subject.el) &&
    same(typed.subjectEn, defaults.subject.en) &&
    same(typed.bodyEl, defaults.body.el) &&
    same(typed.bodyEn, defaults.body.en);
  if (isDefault) return { code };
  return {
    code,
    subjectEl: same(typed.subjectEl, defaults.subject.el)
      ? ""
      : typed.subjectEl,
    bodyEl: same(typed.bodyEl, defaults.body.el) ? "" : typed.bodyEl,
    subjectEn: typed.subjectEn,
    bodyEn: typed.bodyEn,
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
