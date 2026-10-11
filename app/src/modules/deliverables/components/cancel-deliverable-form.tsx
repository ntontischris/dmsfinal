"use client";

import { Field, Select } from "@/components/ui/field";

import { cancelDeliverable } from "../actions-deliverable";
import { CANCEL_OUTCOME_LABELS } from "../labels";
import { CANCEL_OUTCOMES } from "../types";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface CancelDeliverableFormProps {
  deliverableId: string;
}

// Ακύρωση με λόγο· η ομάδα διαλέγει αν η Παροχή καταναλώθηκε ή επιστρέφει στην Περίοδο.
export function CancelDeliverableForm({ deliverableId }: CancelDeliverableFormProps) {
  return (
    <ActionForm action={cancelDeliverable} submitLabel="Ακύρωση" pendingLabel="Ακύρωση…" variant="danger">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <Field label="Λόγος ακύρωσης (υποχρεωτικός)">
        <TextArea name="reason" rows={2} required />
      </Field>
      <Field label="Η Παροχή">
        <Select name="outcome" defaultValue="returned">
          {CANCEL_OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {CANCEL_OUTCOME_LABELS[outcome]}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}
