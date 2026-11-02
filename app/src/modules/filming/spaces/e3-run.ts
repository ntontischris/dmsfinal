"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

// Τα κουμπιά του prototype άλλαζαν κατάσταση στη μνήμη· εδώ καλούν τα πραγματικά server actions (ίδια με τις φόρμες
// της παλιάς σελίδας) και δείχνουν την απάντηση της βάσης. Η σελίδα φρεσκάρεται από το revalidate του action.

export type FormAction = (state: FormState, form: FormData) => Promise<FormState>;

export type Fields = Readonly<Record<string, string | readonly string[]>>;

export interface RunResult {
  text: string;
  tone: "ok" | "error";
}

const formOf = (fields: Fields): FormData => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) =>
    (typeof value === "string" ? [value] : value).forEach((item) =>
      form.append(key, item),
    ),
  );
  return form;
};

export function useRun() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RunResult | null>(null);
  const run = (action: FormAction, fields: Fields, onDone?: () => void) =>
    startTransition(async () => {
      const state = await action({}, formOf(fields));
      if (state.error) {
        setResult({ text: state.error, tone: "error" });
        return;
      }
      setResult({ text: state.notice ?? "Έγινε.", tone: "ok" });
      onDone?.();
    });
  return { run, isPending, result };
}
