"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import { SENDS } from "../labels";

interface ConfirmActionProps {
  label: string;
  confirm: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: Readonly<Record<string, string>>;
  isPrimary?: boolean;
}

// Μια ενέργεια της Υγείας με επιβεβαίωση: πρώτο πάτημα ρωτά, δεύτερο εκτελεί. Μετά δείχνει μόνο το αποτέλεσμα.
export function ConfirmAction({
  label,
  confirm,
  action,
  fields,
  isPrimary = false,
}: ConfirmActionProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_FORM_STATE,
  );
  if (state.notice) return <FormMessage state={state} />;
  if (!isConfirming)
    return (
      <Button
        size="sm"
        variant={isPrimary ? "primary" : "default"}
        onClick={() => setIsConfirming(true)}
      >
        {label}
      </Button>
    );
  return (
    <form action={formAction} className="grid gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="m-0 text-sm">{confirm}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={isPending}>
          {SENDS.confirmYes}: {label}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)}>
          {SENDS.cancel}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
