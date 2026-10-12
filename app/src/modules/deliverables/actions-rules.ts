"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue } from "./action-support";
import {
  kindRowSchema,
  rulesFormSchema,
  type KindRowInput,
} from "./rules-schemas";

// Κανόνες Παραδοτέων (Ρυθμίσεις › Παραδοτέα): μία αποθήκευση με όλα τα πεδία· η βάση κρατά όσα λείπουν.

const checked = (form: FormData, key: string): boolean =>
  form.get(key) === "on";
const text = (form: FormData, key: string): string =>
  String(form.get(key) ?? "");

type KindRows =
  | { success: true; rows: KindRowInput[] }
  | { success: false; error: string };

// Κάθε είδος της φόρμας: «kindId» (κρυφό) και το πεδίο «deadline-<id>». Το όριο αλλαγών δεν αποθηκεύεται εδώ.
const readKindRow = (form: FormData, id: string): unknown => ({
  id,
  deadlineDays: text(form, `deadline-${id}`),
});

function parseKindRows(form: FormData): KindRows {
  const rows: KindRowInput[] = [];
  for (const id of form.getAll("kindId").map(String)) {
    const parsed = kindRowSchema.safeParse(readKindRow(form, id));
    if (!parsed.success)
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Μη έγκυρη τιμή.",
      };
    rows.push(parsed.data);
  }
  return { success: true, rows };
}

export async function saveDeliverableRules(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = rulesFormSchema.safeParse({
    internalReview: checked(form, "internalReview"),
    changesDays: text(form, "changesDays"),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const kinds = parseKindRows(form);
  if (!kinds.success) return { error: kinds.error };
  const outcome = await callRpc("deliverable_settings_save", {
    p_settings: { ...parsed.data, kinds: kinds.rows },
  });
  return finishWith(outcome, "Οι Κανόνες αποθηκεύτηκαν.");
}
