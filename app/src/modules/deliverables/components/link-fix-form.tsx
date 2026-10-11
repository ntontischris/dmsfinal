"use client";

import { Field, Input } from "@/components/ui/field";

import { fixDeliverableLink } from "../actions-versions";

import { ActionForm } from "./action-form";

interface LinkFixFormProps {
  deliverableId: string;
}

// Διόρθωση του link της τελευταίας Έκδοσης (π.χ. όταν ο πελάτης λέει ότι δεν ανοίγει).
export function LinkFixForm({ deliverableId }: LinkFixFormProps) {
  return (
    <ActionForm action={fixDeliverableLink} submitLabel="Διόρθωση link" pendingLabel="Διόρθωση…" variant="default">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <Field label="Σωστό link για την τελευταία Έκδοση">
        <Input name="url" type="url" placeholder="https://" required autoComplete="off" />
      </Field>
    </ActionForm>
  );
}
