"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Field, Input } from "@/components/ui/field";

import { setPassword } from "../actions";
import { INITIAL_FORM_STATE, MIN_PASSWORD } from "../schemas";

// R10 Νέος κωδικός: μετά από πρόσκληση ή επαναφορά.
export function SetPasswordForm() {
  const [state, action, isSaving] = useActionState(setPassword, INITIAL_FORM_STATE);
  return (
    <form action={action} className="grid gap-3">
      <Field label="Νέος κωδικός" hint={`Τουλάχιστον ${MIN_PASSWORD} χαρακτήρες.`}>
        <Input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
      </Field>
      <Field label="Ξανά ο κωδικός">
        <Input name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
      </Field>
      <FormMessage state={state} />
      <Button variant="primary" type="submit" disabled={isSaving}>
        {isSaving ? "Αποθήκευση…" : "Αποθήκευση και είσοδος"}
      </Button>
    </form>
  );
}
