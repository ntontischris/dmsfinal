"use client";

import type { ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

// Οι φόρμες της N5 στη μορφή του prototype (`.button`, `.note`), με τα πραγματικά actions της Ενσωμάτωσης.

interface N5FormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  isPrimary?: boolean;
  isDanger?: boolean;
  resetOnSuccess?: boolean;
  // Κουμπιά δίπλα στο κύριο (π.χ. «Άκυρο»).
  after?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function N5Form({
  action,
  submitLabel,
  pendingLabel = "Περιμένε…",
  isPrimary = false,
  isDanger = false,
  resetOnSuccess = false,
  after,
  className,
  children,
}: N5FormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {children}
      {state.error && (
        <p className="note n5-warning" role="alert">
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
          data-primary={isPrimary ? "true" : undefined}
          data-danger={isDanger ? "true" : undefined}
          disabled={isPending}
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
        {after}
      </div>
    </form>
  );
}
