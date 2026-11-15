"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

// Τα κουμπιά του prototype άλλαζαν κατάσταση στη μνήμη· εδώ καλούν τα πραγματικά server actions (ίδια με τις φόρμες
// της παλιάς σελίδας) και δείχνουν την απάντηση της βάσης. Μετά την επιτυχία η σελίδα ξαναφορτώνεται μόνη της.

export type FormAction = (state: FormState, form: FormData) => Promise<FormState>;

export type Fields = Readonly<Record<string, string | readonly string[]>>;

export interface RunResult {
  text: string;
  tone: "ok" | "warn" | "error";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RunResult | null>(null);
  const run = (action: FormAction, fields: Fields, onDone?: () => void) =>
    startTransition(async () => {
      const state = await action({}, formOf(fields));
      if (state.error) {
        setResult({ text: state.error, tone: "error" });
        return;
      }
      setResult(
        state.warning
          ? { text: state.warning, tone: "warn" }
          : { text: state.notice ?? "Έγινε.", tone: "ok" },
      );
      onDone?.();
      // Χωρίς F5: η σελίδα ξαναφορτώνει τα δεδομένα της μόλις πετύχει η ενέργεια.
      router.refresh();
    });
  return { run, isPending, result };
}
