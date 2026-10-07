"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Field, Input } from "@/components/ui/field";

import { requestPasswordReset } from "../actions";
import { INITIAL_FORM_STATE } from "../schemas";

// R10 Επαναφορά κωδικού: σύνδεσμος στο email, που ισχύει 1 ώρα.
export function ResetForm() {
  const [state, action, isSending] = useActionState(requestPasswordReset, INITIAL_FORM_STATE);
  return (
    <form action={action} className="grid gap-3">
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
