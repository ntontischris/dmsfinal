"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Field, Input } from "@/components/ui/field";
import { useKeptForm } from "@/lib/use-kept-form";

import { requestPasswordReset } from "../actions";

// R10 Επαναφορά κωδικού: σύνδεσμος στο email, που ισχύει 1 ώρα.
export function ResetForm() {
  const { state, isPending: isSending, onSubmit: action, formRef: actionRef } = useKeptForm(requestPasswordReset);
  return (
    <form ref={actionRef} onSubmit={action} className="grid gap-3">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={state} />
      <Button variant="primary" type="submit" disabled={isSending}>
        {isSending ? "Αποστολή…" : "Στείλε σύνδεσμο επαναφοράς"}
      </Button>
    </form>
  );
}
