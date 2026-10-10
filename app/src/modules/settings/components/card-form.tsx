"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

interface CardFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  version?: string; // updated_at που είδε ο Χρήστης: αν άλλαξε στο μεταξύ, η αποθήκευση το λέει
  isLocked?: boolean;
  submitLabel?: string;
  resetOnSuccess?: boolean; // για φόρμες «νέο …»: αδειάζει μετά την επιτυχία
  onlyWhenChanged?: boolean; // κρύβει το κουμπί όσο δεν έχει αλλάξει τιμή από την τελευταία αποθήκευση
  children: ReactNode;
}

// Μια κάρτα Ρυθμίσεων που αποθηκεύεται μόνη της. Κλειδωμένη: τα πεδία φαίνονται, χωρίς κουμπί.
export function CardForm({
  action,
  version,
  isLocked = false,
  submitLabel = "Αποθήκευση",
  resetOnSuccess = false,
  onlyWhenChanged = false,
  children,
}: CardFormProps) {
  const { state, isPending: isSaving, onSubmit: formAction, formRef: formActionRef } = useKeptForm(action, { resetOnSuccess });
  const isChanged = useFormChanged(formActionRef, state.notice ? state : undefined);
  const showSubmit = !isLocked && (!onlyWhenChanged || isChanged);
  return (
    <form ref={formActionRef} onSubmit={formAction} className="grid gap-3">
      {version && <input type="hidden" name="version" value={version} />}
      <fieldset
        disabled={isLocked}
        className="m-0 grid min-w-0 items-start gap-3 border-0 p-0 sm:grid-cols-2"
      >
        {children}
      </fieldset>
      <FormMessage state={state} />
      {showSubmit && (
        <div>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? "Αποθήκευση…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
