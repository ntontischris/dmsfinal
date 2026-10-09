"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { createAgreement } from "../actions-draft";
import { KIND_LABELS } from "../labels";

import { ActionForm } from "./action-form";
import { MutedNote } from "./terms-section-parts";

interface CreateAgreementFormProps {
  opportunityId: string;
  defaultTitle: string;
}

// Η πρόταση γεννιέται πάντα μέσα σε μια Ευκαιρία. Μετά τη δημιουργία ο χρήστης πηγαίνει στη σελίδα της Συμφωνίας (D2).
export function CreateAgreementForm({
  opportunityId,
  defaultTitle,
}: CreateAgreementFormProps) {
  return (
    <ActionForm
      action={createAgreement}
      submitLabel="Σύνταξη πρότασης"
      pendingLabel="Δημιουργία…"
      variant="primary"
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Field label="Είδος">
        <Select name="kind" defaultValue="" required>
          <option value="">Διάλεξε…</option>
          <option value="monthly">{KIND_LABELS.monthly}</option>
          <option value="one_off">{KIND_LABELS.one_off}</option>
        </Select>
      </Field>
      <Field label="Τίτλος">
        <Input name="title" defaultValue={defaultTitle} autoComplete="off" />
      </Field>
      <MutedNote>
        Η Συμφωνία γράφεται στη σελίδα της: γραμμές από τον Κατάλογο, Όροι από
        τις Ρυθμίσεις.
      </MutedNote>
    </ActionForm>
  );
}
