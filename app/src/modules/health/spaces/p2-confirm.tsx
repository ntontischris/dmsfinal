"use client";

import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import { SENDS } from "../labels";

interface ConfirmActionProps {
  label: string;
  confirm: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: Readonly<Record<string, string>>;
  isPrimary?: boolean;
}

// Τα κουμπιά «Ξαναστείλε / Αγνόησε / Ξαναδοκίμασε» του prototype, δεμένα στις πραγματικές ενέργειες:
// πρώτο πάτημα ρωτά, δεύτερο εκτελεί, μετά δείχνει μόνο το αποτέλεσμα (γράφεται στο Ίχνος).
export function ConfirmAction({
  label,
  confirm,
  action,
  fields,
  isPrimary = false,
}: ConfirmActionProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_FORM_STATE,
  );
  if (state.notice)
    return (
      <p className="note" role="status">
        {state.notice}
      </p>
    );
  if (!isConfirming)
    return (
      <button
        type="button"
        className="button"
        data-primary={isPrimary ? "true" : undefined}
        onClick={() => setIsConfirming(true)}
      >
        {label}
      </button>
    );
  return (
    <form action={formAction} className="btn-row">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="muted">{confirm}</span>
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending}
      >
        {SENDS.confirmYes}: {label}
      </button>
      <button
        type="button"
        className="button"
        onClick={() => setIsConfirming(false)}
      >
        {SENDS.cancel}
      </button>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
