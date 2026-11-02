"use client";

import type { ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

interface SpacesActionFormProps {
  action: Action;
  submitLabel: string;
  className?: string;
  isPrimary?: boolean;
  resetOnSuccess?: boolean;
  children?: ReactNode;
}

// Αντίγραφο του `sales/spaces/spaces-form.tsx` (οι Συμφωνίες δεν εισάγουν τις Πωλήσεις: οι Πωλήσεις εισάγουν τις Συμφωνίες).
// Οι φόρμες των οθονών του prototype (`.field`, `.note`, `.button`) πάνω σε πραγματική ενέργεια: κρατά ό,τι γράφτηκε αν
// η βάση πει όχι, δείχνει το λάθος ή την ενημέρωση όπως τα δείχνει το prototype.
export function SpacesActionForm({
  action,
  submitLabel,
  className = "stack",
  isPrimary = true,
  resetOnSuccess = false,
  children,
}: SpacesActionFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  return (
    <form ref={formRef} className={className} onSubmit={onSubmit}>
      {children}
      {state.error && (
        <ul className="note" role="alert">
          <li>{state.error}</li>
        </ul>
      )}
      {state.notice && (
        <p className="note" role="status">
          {state.notice}
        </p>
      )}
      <span className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary={isPrimary ? "true" : undefined}
          disabled={isPending}
        >
          {submitLabel}
        </button>
      </span>
    </form>
  );
}

export function SpacesField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
