"use client";

import { useEffect, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Οι φόρμες του H4 (`.h34-form`, `.btn-row` του prototype) πάνω στις πραγματικές ενέργειες του πελάτη.
// Κρατά ό,τι γράφτηκε αν η βάση πει όχι και δείχνει το λάθος της· με επιτυχία η σελίδα φρεσκάρεται από τη βάση.

interface H34FormProps {
  action: Action;
  hidden: Readonly<Record<string, string>>;
  submitLabel: string;
  // Πεδίο που στέλνει μόνο το κουμπί (π.χ. confirmFinal=1 στο «Επιβεβαιώνω την έγκριση»).
  submitField?: { name: string; value: string };
  isPrimary?: boolean;
  isDisabled?: boolean;
  hasFrame?: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}

export function H34Form({
  action,
  hidden,
  submitLabel,
  submitField,
  isPrimary = false,
  isDisabled = false,
  hasFrame = true,
  onSuccess,
  onClose,
  children,
}: H34FormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  useEffect(() => {
    if (state.notice) onSuccess?.();
  }, [state, onSuccess]);
  return (
    <form
      ref={formRef}
      className={hasFrame ? "h34-form" : undefined}
      onSubmit={onSubmit}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {state.error && (
        <span className="h34-error" role="alert">
          {state.error}
        </span>
      )}
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary={isPrimary ? "true" : undefined}
          name={submitField?.name}
          value={submitField?.value}
          disabled={isPending || isDisabled}
        >
          {submitLabel}
        </button>
        {onClose && (
          <button type="button" className="button" onClick={onClose}>
            Άκυρο
          </button>
        )}
      </div>
    </form>
  );
}
