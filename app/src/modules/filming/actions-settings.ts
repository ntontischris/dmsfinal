"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue } from "./action-support";
import { settingsSchema } from "./schemas";

// Κανόνες γυρισμάτων (Ρυθμίσεις › Γυρίσματα): μία αποθήκευση με όλα τα πεδία· η βάση κρατά τα μη σταλμένα ως έχουν.

const checked = (form: FormData, key: string): boolean =>
  form.get(key) === "on";
const text = (form: FormData, key: string): string =>
  String(form.get(key) ?? "");

export async function saveFilmingSettings(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = settingsSchema.safeParse({
    bookingNeedsApproval: checked(form, "bookingNeedsApproval"),
    noAnswerAction: text(form, "noAnswerAction"),
    noAnswerHours: Number(text(form, "noAnswerHours")),
    horizonDays: Number(text(form, "horizonDays")),
    allowOutsidePeriod: checked(form, "allowOutsidePeriod"),
    rescheduleNeedsApproval: checked(form, "rescheduleNeedsApproval"),
    equipmentConflict: text(form, "equipmentConflict"),
    clientSeesEquipment: checked(form, "clientSeesEquipment"),
    sheetSending: text(form, "sheetSending"),
    changeResetsConfirmations: checked(form, "changeResetsConfirmations"),
    doneMarking: text(form, "doneMarking"),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_settings_save", {
    p_settings: parsed.data,
  });
  return finishWith(outcome, "Οι Κανόνες αποθηκεύτηκαν.");
}
