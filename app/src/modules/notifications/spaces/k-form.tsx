"use client";

import { useEffect, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Το αποτέλεσμα μιας ενέργειας στο ύφος του prototype: λάθος ως alert, επιτυχία ως status.
export function KMessage({ state }: { state: FormState<unknown> }) {
  if (state.error)
    return (
      <p className="k1-error" role="alert">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p className="note" role="status">
        {state.notice}
      </p>
    );
  return null;
}

interface KFormProps {
  action: Action;
  submitLabel: string;
  className?: string;
  // Επεξεργασία: το κουμπί ανάβει μόνο όταν άλλαξε κάτι από την τελευταία αποθήκευση.
  onlyWhenChanged?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  extraButtons?: ReactNode;
  children: ReactNode;
}

// Η φόρμα των K1/K2 πάνω στις πραγματικές ενέργειες· κρατά ό,τι γράφτηκε αν η βάση πει όχι.
export function KForm({
  action,
  submitLabel,
  className,
  onlyWhenChanged = false,
  resetOnSuccess = false,
  onSuccess,
  extraButtons,
  children,
}: KFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  useEffect(() => {
    if (state.notice) onSuccess?.();
  }, [state, onSuccess]);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {children}
      <KMessage state={state} />
      <div className="btn-row" style={{ marginTop: "var(--space-3)" }}>
        <button
          className="button"
          data-primary="true"
          type="submit"
          disabled={isPending || (onlyWhenChanged && !isChanged)}
        >
          {isPending ? "Αποθήκευση…" : submitLabel}
        </button>
        {extraButtons}
      </div>
    </form>
  );
}
