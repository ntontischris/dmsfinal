"use client";

import { useEffect, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

interface JFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  // Χωρίς ετικέτα δεν μπαίνει κουμπί υποβολής: τα κουμπιά τα δίνουν τα children (π.χ. ένα ανά είδος Αιτήματος).
  submitLabel?: string;
  pendingLabel?: string;
  isDanger?: boolean;
  onlyWhenChanged?: boolean;
  resetOnSuccess?: boolean;
  isDisabled?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  // Δίπλα στο κουμπί (π.χ. «μπορείς να το διορθώσεις για 15 λεπτά»).
  aside?: ReactNode;
  children: ReactNode;
}

// Η φόρμα των ενεργειών της Συνομιλίας στο ύφος του prototype (`.j2-form`, `.btn-row`), δεμένη στα πραγματικά server actions.
// Κρατά ό,τι γράφτηκε αν αποτύχει· το λάθος φαίνεται όπως στο prototype (`.j2-error`).
export function JForm({
  action,
  submitLabel,
  pendingLabel = "Αποθήκευση…",
  isDanger = false,
  onlyWhenChanged = false,
  resetOnSuccess = false,
  isDisabled = false,
  onSuccess,
  onCancel,
  className = "j2-form",
  aside,
  children,
}: JFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  useEffect(() => {
    if (state.notice) onSuccess?.();
  }, [state, onSuccess]);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  const showSubmit =
    submitLabel !== undefined && (!onlyWhenChanged || isChanged);
  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {children}
      {state.error && (
        <p className="j2-error" role="alert">
          {state.error}
        </p>
      )}
      {(showSubmit || onCancel || aside) && (
        <div className="btn-row">
          {showSubmit && (
            <button
              className="button"
              type="submit"
              data-primary={!isDanger}
              data-danger={isDanger}
              disabled={isPending || isDisabled}
            >
              {isPending ? pendingLabel : submitLabel}
            </button>
          )}
          {onCancel && (
            <button className="button" type="button" onClick={onCancel}>
              Άκυρο
            </button>
          )}
          {aside}
        </div>
      )}
    </form>
  );
}
