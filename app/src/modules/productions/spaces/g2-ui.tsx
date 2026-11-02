"use client";

import { useState, useTransition } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

// Κοινά της Σελίδας Παραγωγής (prototype `screens/g2-ui.tsx`). Στο prototype τα κουμπιά άλλαζαν τοπική κατάσταση· εδώ
// καλούν την πραγματική ενέργεια και η βάση αποφασίζει. Το αποτέλεσμα (ή η άρνηση) φαίνεται δίπλα στο κουμπί.

export type ProductionAction = (
  state: FormState,
  form: FormData,
) => Promise<FormState>;

// Μία ενέργεια με τα πεδία της: φτιάχνει τη FormData και κρατά το τελευταίο αποτέλεσμα.
export function useRun(action: ProductionAction) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState>(INITIAL_FORM_STATE);
  const run = (
    fields: Readonly<Record<string, string>>,
    onDone?: (state: FormState) => void,
  ) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    startTransition(async () => {
      const state = await action(INITIAL_FORM_STATE, form);
      setResult(state);
      onDone?.(state);
    });
  };
  return { run, result, isPending };
}

// Το αποτέλεσμα μιας ενέργειας: ✓ μήνυμα ή η άρνηση της βάσης.
export function RunResult({ result }: { result: FormState }) {
  if (result.error)
    return (
      <p className="note" role="alert">
        {result.error}
      </p>
    );
  if (result.notice)
    return (
      <p className="muted" role="status">
        {result.notice}
      </p>
    );
  return null;
}

interface ReasonFormProps {
  label: string;
  confirmLabel: string;
  isDanger?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// Φόρμα με υποχρεωτικό λόγο: ίδιο σχήμα για παράδοση χειροκίνητα, ακύρωση και επανάνοιγμα.
export function ReasonForm({
  label,
  confirmLabel,
  isDanger,
  isPending = false,
  onConfirm,
  onClose,
}: ReasonFormProps) {
  const [reason, setReason] = useState("");
  const isValid = reason.trim().length > 0;
  return (
    <div className="g2-form">
      <label>
        {label}
        <input
          className="input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-required
        />
      </label>
      {!isValid && <span className="muted">Ο λόγος είναι υποχρεωτικός.</span>}
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger={isDanger}
          disabled={!isValid || isPending}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}
