"use client";

import { Field } from "@/components/ui/field";

import { APPROVAL_FINAL_NOTE } from "../client-labels";
import { answerDeliverable } from "../actions-client";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface ClientDecisionFormsProps {
  deliverableId: string;
  overLimit: boolean;
  roundsUsed: number;
}

// Η απάντηση του πελάτη (Π6): «Ενέκρινε» με επιβεβαίωση, ή «Ζήτησε αλλαγές» με σημείωση. Η πρώτη απάντηση ισχύει.
export function ClientDecisionForms({ deliverableId, overLimit, roundsUsed }: ClientDecisionFormsProps) {
  return (
    <div className="grid gap-5">
      {overLimit && (
        <p className="m-0 text-sm text-destructive">
          Έχεις χρησιμοποιήσει τους {roundsUsed} γύρους αλλαγών· οι επόμενες αλλαγές μπορεί να χρεωθούν.
        </p>
      )}
      <ActionForm action={answerDeliverable} submitLabel="Ενέκρινε" pendingLabel="Έγκριση…">
        <input type="hidden" name="deliverableId" value={deliverableId} />
        <input type="hidden" name="decision" value="approve" />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmFinal" value="1" required className="mt-1" />
          <span>{APPROVAL_FINAL_NOTE}</span>
        </label>
      </ActionForm>
      <ActionForm action={answerDeliverable} submitLabel="Ζήτησε αλλαγές" pendingLabel="Αποστολή…" variant="default">
        <input type="hidden" name="deliverableId" value={deliverableId} />
        <input type="hidden" name="decision" value="changes" />
        <Field label="Σημείωση (υποχρεωτική)">
          <TextArea name="note" rows={3} required />
        </Field>
      </ActionForm>
    </div>
  );
}
