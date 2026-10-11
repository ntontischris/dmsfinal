"use client";

import { Field, Input } from "@/components/ui/field";

import { addVersion } from "../actions-versions";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface AddVersionFormProps {
  deliverableId: string;
}

// Νέα Έκδοση: link (Drive, Vimeo ή YouTube) και σημείωση. Η βάση διαλέγει την πορεία (έλεγχος ή πελάτης).
export function AddVersionForm({ deliverableId }: AddVersionFormProps) {
  return (
    <ActionForm action={addVersion} submitLabel="Προσθήκη Έκδοσης" pendingLabel="Προσθήκη…">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <Field label="Link Έκδοσης (Google Drive, Vimeo ή YouTube)">
        <Input name="url" type="url" placeholder="https://" required autoComplete="off" />
      </Field>
      <Field label="Σημείωση (προαιρετική)">
        <TextArea name="note" rows={2} />
      </Field>
    </ActionForm>
  );
}
