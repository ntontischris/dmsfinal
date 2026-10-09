"use client";

import { Field } from "@/components/ui/field";

import { cancelProduction, deliverProduction, reopenProduction } from "../actions-state";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface StateFormProps {
  productionId: string;
}

// Οι τρεις μεταβάσεις της Παραγωγής (Π8). Κάθε μία ζητά λόγο ή σχόλιο· η βάση ξαναελέγχει.

export function DeliverForm({ productionId }: StateFormProps) {
  return (
    <ActionForm
      action={deliverProduction}
      submitLabel="Παράδοση"
      pendingLabel="Παράδοση…"
    >
      <input type="hidden" name="productionId" value={productionId} />
      <Field label="Τι παραδόθηκε και πού (υποχρεωτικό)">
        <TextArea name="note" rows={2} required />
      </Field>
    </ActionForm>
  );
}

export function ReopenForm({ productionId }: StateFormProps) {
  return (
    <ActionForm
      action={reopenProduction}
      submitLabel="Επανάνοιγμα"
      pendingLabel="Επανάνοιγμα…"
      variant="default"
    >
      <input type="hidden" name="productionId" value={productionId} />
      <Field label="Λόγος επανανοίγματος (υποχρεωτικός)">
        <TextArea name="reason" rows={2} required />
      </Field>
    </ActionForm>
  );
}

export function CancelForm({ productionId }: StateFormProps) {
  return (
    <ActionForm
      action={cancelProduction}
      submitLabel="Ακύρωση"
      pendingLabel="Ακύρωση…"
      variant="danger"
    >
      <input type="hidden" name="productionId" value={productionId} />
      <Field label="Λόγος ακύρωσης (υποχρεωτικός)">
        <TextArea name="reason" rows={2} required />
      </Field>
    </ActionForm>
  );
}
