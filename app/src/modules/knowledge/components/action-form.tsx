"use client";

import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

interface ActionFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  onlyWhenChanged?: boolean; // κρύβει το κουμπί όσο δεν έχει αλλάξει τιμή από την τελευταία αποθήκευση
  resetOnSuccess?: boolean; // αδειάζει τη φόρμα μετά την επιτυχία (νέα εγγραφή), ώστε δεύτερο κλικ να μη διπλογράφει
  onSuccess?: () => void;
  submitVariant?: "primary" | "danger";
  isDisabled?: boolean; // κρατά το κουμπί ανενεργό όσο λείπουν υποχρεωτικά πεδία
  children: ReactNode;
}

// Η φόρμα της Γνώσης: πεδία, μήνυμα αποτελέσματος και κουμπί, με κρατημένες τιμές αν αποτύχει.
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Αποθήκευση…",
  onlyWhenChanged = false,
  resetOnSuccess = false,
  onSuccess,
  submitVariant = "primary",
  isDisabled = false,
  children,
}: ActionFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, { resetOnSuccess });
  useEffect(() => {
    if (state.notice) onSuccess?.();
  }, [state, onSuccess]);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  const showSubmit = !onlyWhenChanged || isChanged;
  return (
    <form ref={formRef} onSubmit={onSubmit} className={cn("grid gap-3")}>
      {children}
      <FormMessage state={state} />
      {showSubmit && (
        <div>
          <Button type="submit" variant={submitVariant} disabled={isPending || isDisabled}>
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
