"use client";

import { Field } from "@/components/ui/field";

import { approveDeliverableInternally, returnVersion, sendVersion } from "../actions-versions";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface DeliverableFormProps {
  deliverableId: string;
}

// Οι ενέργειες πάνω στην τελευταία Έκδοση: στέλνεις, επιστρέφεις με σημείωση, ή εγκρίνεις εσωτερικά.

export function SendVersionForm({ deliverableId }: DeliverableFormProps) {
  return (
    <ActionForm action={sendVersion} submitLabel="Στείλε στον πελάτη" pendingLabel="Αποστολή…">
      <input type="hidden" name="deliverableId" value={deliverableId} />
    </ActionForm>
  );
}

export function ReturnVersionForm({ deliverableId }: DeliverableFormProps) {
  return (
    <ActionForm action={returnVersion} submitLabel="Επέστρεψε" pendingLabel="Επιστροφή…" variant="default">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <Field label="Σημείωση επιστροφής (υποχρεωτική)">
        <TextArea name="note" rows={2} required />
      </Field>
    </ActionForm>
  );
}

export function ApproveInternalForm({ deliverableId }: DeliverableFormProps) {
  return (
    <ActionForm action={approveDeliverableInternally} submitLabel="Ενέκρινε" pendingLabel="Έγκριση…">
      <input type="hidden" name="deliverableId" value={deliverableId} />
    </ActionForm>
  );
}
