"use client";

import { Field } from "@/components/ui/field";

import { requestChangeAfterApproval } from "../actions-client";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

// Αίτημα αλλαγής μετά την έγκριση: η ομάδα αποφασίζει (δεκτό ως γύρος, χρεώνεται ή νέο Παραδοτέο).
export function ClientRequestForm({ deliverableId }: { deliverableId: string }) {
  return (
    <ActionForm action={requestChangeAfterApproval} submitLabel="Ζητώ αλλαγή" pendingLabel="Αποστολή…" variant="default">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <Field label="Τι αλλαγή χρειάζεσαι;">
        <TextArea name="body" rows={3} required />
      </Field>
    </ActionForm>
  );
}
