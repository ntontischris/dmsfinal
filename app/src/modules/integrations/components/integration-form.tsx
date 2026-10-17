"use client";

import type { ReactNode } from "react";

import { Button, type ButtonVariantProps } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

interface IntegrationFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  variant?: ButtonVariantProps["variant"];
  resetOnSuccess?: boolean;
  isDisabled?: boolean;
  children?: ReactNode;
}

// Μια μικρή φόρμα της N5 που κρατά ό,τι γράφτηκε και δείχνει το μήνυμα της ενέργειας.
export function IntegrationForm({
  action,
  submitLabel,
  pendingLabel = "Περιμένε…",
  variant = "default",
  resetOnSuccess = false,
  isDisabled = false,
  children,
}: IntegrationFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3">
      {children}
      <FormMessage state={state} />
      <div>
        <Button
          type="submit"
          variant={variant}
          disabled={isPending || isDisabled}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
