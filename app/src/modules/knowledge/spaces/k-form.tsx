"use client";

import { useEffect, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

interface SpacesFormProps {
  action: Action;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  tone?: "primary" | "danger" | "plain";
  isDisabled?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  children?: ReactNode;
}

// Οι φόρμες της Γνώσης στη νέα εμφάνιση: το κουμπί και οι σημειώσεις του prototype πάνω στην πραγματική ενέργεια.
// Κρατά ό,τι γράφτηκε αν η βάση πει όχι (όπως το ActionForm της παλιάς εμφάνισης).
export function SpacesForm({
  action,
  submitLabel,
  pendingLabel = "Αποθήκευση…",
  className,
  tone = "primary",
  isDisabled = false,
  resetOnSuccess = false,
  onSuccess,
  children,
}: SpacesFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  useEffect(() => {
    if (state.notice) onSuccess?.();
  }, [state, onSuccess]);
  return (
    <form ref={formRef} className={className} onSubmit={onSubmit}>
      {children}
      {state.error && (
        <p className="note" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="note" role="status">
          {state.notice}
        </p>
      )}
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary={tone === "primary" ? "true" : undefined}
          data-danger={tone === "danger" ? "true" : undefined}
          disabled={isPending || isDisabled}
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
