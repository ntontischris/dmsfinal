"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

interface ActionFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "default" | "danger";
  size?: "md" | "sm";
  resetOnSuccess?: boolean;
  className?: string;
  children: ReactNode;
}

// Η φόρμα όλων των ενεργειών των Παραγωγών: πεδία, μήνυμα αποτελέσματος και κουμπί, με κρατημένες τιμές αν αποτύχει.
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Αποθήκευση…",
  variant = "primary",
  size = "md",
  resetOnSuccess = false,
  className,
  children,
}: ActionFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={cn("grid gap-3", className)}
    >
      {children}
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant={variant} size={size} disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
