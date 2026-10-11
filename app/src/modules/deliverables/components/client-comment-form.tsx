"use client";

import { Field, Input } from "@/components/ui/field";

import { commentAsClient } from "../actions-client";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface ClientCommentFormProps {
  deliverableId: string;
  versionNumber: number;
}

// Σχόλιο του πελάτη σε μια σταλμένη Έκδοση, με προαιρετικό χρόνο mm:ss γραμμένο με το χέρι.
export function ClientCommentForm({ deliverableId, versionNumber }: ClientCommentFormProps) {
  return (
    <ActionForm action={commentAsClient} submitLabel="Σχόλιο" pendingLabel="Αποστολή…" variant="default">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="versionNumber" value={versionNumber} />
      <Field label="Σχόλιο">
        <TextArea name="body" rows={2} required />
      </Field>
      <Field label="Χρόνος (mm:ss, προαιρετικός)" hint="Π.χ. 0:42 για το δευτερόλεπτο 42.">
        <Input name="atSeconds" placeholder="0:12" autoComplete="off" />
      </Field>
    </ActionForm>
  );
}
