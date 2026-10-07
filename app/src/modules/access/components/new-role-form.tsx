"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

import type { RoleKind, RoleSummary } from "../queries";
import { INITIAL_FORM_STATE } from "../schemas";
import { createRole } from "../team-actions";
import { FormMessage } from "./form-message";

// N4 Νέος Ρόλος: από το μηδέν ή ως «Αντίγραφο του…». Το είδος δεν αλλάζει μετά.
export function NewRoleForm({
  kind,
  sources,
}: {
  kind: RoleKind;
  sources: readonly RoleSummary[];
}) {
  const [state, action, isSaving] = useActionState(
    createRole,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action} className="grid max-w-md gap-3">
      <input type="hidden" name="kind" value={kind} />
      <Field
        label="Όνομα"
        hint="π.χ. «Εκδηλώσεις» για εξωτερικό συνεργάτη που βλέπει μόνο τα Γυρίσματά του."
      >
        <Input name="name" required />
      </Field>
      <Field label="Ξεκίνα από">
        <Select name="copyFrom" defaultValue="">
          <option value="">Το μηδέν (κανένα Δικαίωμα)</option>
          {sources.map((role) => (
            <option key={role.id} value={role.id}>
              Αντίγραφο του «{role.name}»
            </option>
          ))}
        </Select>
      </Field>
      <FormMessage state={state} />
      <Button variant="primary" type="submit" disabled={isSaving}>
        {isSaving ? "Δημιουργία…" : "Δημιουργία Ρόλου"}
      </Button>
    </form>
  );
}
