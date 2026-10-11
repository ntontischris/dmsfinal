"use client";

import { Field, Input } from "@/components/ui/field";

import { addComment } from "../actions-comments";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface CommentFormProps {
  deliverableId: string;
  versionNumber: number;
}

// Σχόλιο σε μια Έκδοση: χρόνος mm:ss (προαιρετικός, γράφεται με το χέρι) και «Εσωτερικό».
export function CommentForm({ deliverableId, versionNumber }: CommentFormProps) {
  return (
    <ActionForm action={addComment} submitLabel="Σχόλιο" pendingLabel="Αποστολή…" variant="default">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="versionNumber" value={versionNumber} />
      <Field label="Σχόλιο">
        <TextArea name="body" rows={2} required />
      </Field>
      <Field label="Χρόνος (mm:ss, προαιρετικός)" hint="Π.χ. 0:42 για το δευτερόλεπτο 42.">
        <Input name="atSeconds" placeholder="0:12" autoComplete="off" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isInternal" value="1" />
        Εσωτερικό (ο πελάτης δεν το βλέπει)
      </label>
    </ActionForm>
  );
}
