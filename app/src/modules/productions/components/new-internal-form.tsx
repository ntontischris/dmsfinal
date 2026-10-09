"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { createInternalProduction } from "../actions-create";
import type { OwnerCandidate } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

interface NewInternalFormProps {
  candidates: readonly OwnerCandidate[];
}

const NO_OWNER_OPTION = "Χωρίς υπεύθυνο";

// Νέα Εσωτερική Παραγωγή: τίτλος και Υπεύθυνος. Χωρίς Πελάτη, Συμφωνία και Περίοδο.
export function NewInternalForm({ candidates }: NewInternalFormProps) {
  return (
    <ActionForm
      action={createInternalProduction}
      submitLabel="Δημιουργία"
      pendingLabel="Δημιουργία…"
    >
      <Field label="Τίτλος">
        <Input name="title" required autoComplete="off" />
      </Field>
      <Field label="Υπεύθυνος">
        <Select name="ownerId" defaultValue="">
          <option value="">{NO_OWNER_OPTION}</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </Select>
      </Field>
      <MutedNote>Οι Εσωτερικές Παραγωγές δεν έχουν Πελάτη ούτε Συμφωνία.</MutedNote>
    </ActionForm>
  );
}
