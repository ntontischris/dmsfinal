"use client";

import { Field, Select } from "@/components/ui/field";

import { transferProduction } from "../actions-team";
import type { OwnerCandidate } from "../types";

import { ActionForm } from "./action-form";

interface TransferFormProps {
  productionId: string;
  choices: readonly OwnerCandidate[];
}

// Μεταβίβαση Υπευθύνου (Π5): μόνο με Εύρος «όλα», προς Χρήστη με Δικαίωμα Παραγωγών.
export function TransferForm({ productionId, choices }: TransferFormProps) {
  return (
    <ActionForm
      action={transferProduction}
      submitLabel="Μεταβίβαση"
      pendingLabel="Μεταβίβαση…"
      variant="default"
    >
      <input type="hidden" name="productionId" value={productionId} />
      <Field label="Νέος Υπεύθυνος">
        <Select name="ownerId" required defaultValue="">
          <option value="" disabled>
            Διάλεξε Υπεύθυνο…
          </option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.name}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}
