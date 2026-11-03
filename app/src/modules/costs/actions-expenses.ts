"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue } from "./action-support";
import { saveExpensesSchema } from "./expenses-schema";

// Αποθήκευση των Εξόδων ενός μήνα (I6): όλη η ανάλυση μαζί με τις παραγωγικές ώρες, σε μία κλήση.
// Η βάση αντικαθιστά την ανάλυση, γράφει το σύνολο (άθροισμα γραμμών) και ελέγχει Δικαίωμα και κλεισμένο μήνα.

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export async function saveExpenses(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = saveExpensesSchema.safeParse({
    month: String(form.get("month") ?? ""),
    categories: parseJson(String(form.get("categories") ?? "")),
    productiveHours: String(form.get("productiveHours") ?? ""),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { month, categories, productiveHours } = parsed.data;
  const outcome = await callRpc("cost_save_expenses", {
    p_month: month,
    p_categories: categories,
    p_productive_hours: productiveHours,
  });
  return finishWith(
    outcome,
    "Αποθηκεύτηκε. Ισχύει από αυτόν τον μήνα και μετά· οι κλεισμένοι μήνες δεν αλλάζουν.",
  );
}
