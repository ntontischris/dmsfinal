import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

// Τα κουμπιά του prototype πάνω στις πραγματικές ενέργειες (server actions με FormData): ίδιο DOM με το prototype,
// χωρίς <form>. Η βάση αποφασίζει· το μήνυμά της (λάθος ή επιτυχία) μένει για να φανεί δίπλα στα κουμπιά.

export type FieldValue = string | readonly string[];
export type EquipmentAction = (
  state: FormState,
  form: FormData,
) => Promise<FormState>;

export const toFormData = (
  fields: Readonly<Record<string, FieldValue>>,
): FormData => {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    const values = typeof value === "string" ? [value] : value;
    for (const one of values) form.append(name, one);
  }
  return form;
};

export function useRunAction() {
  const [isPending, startTransition] = useTransition();
  const [last, setLast] = useState<FormState>({});
  const run = (
    action: EquipmentAction,
    fields: Readonly<Record<string, FieldValue>>,
    onDone?: () => void,
  ) =>
    startTransition(async () => {
      const state = await action({}, toFormData(fields));
      setLast(state);
      if (!state.error) onDone?.();
    });
  return { isPending, last, run };
}
