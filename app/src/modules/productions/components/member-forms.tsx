"use client";

import { Field, Select } from "@/components/ui/field";

import { addProductionMember, removeProductionMember } from "../actions-team";
import type { OwnerCandidate } from "../types";

import { ActionForm } from "./action-form";

interface AddMemberFormProps {
  productionId: string;
  choices: readonly OwnerCandidate[];
}

// Προσθήκη Μέλους με το χέρι (Π6). Μόνο όσοι δεν είναι ήδη Υπεύθυνος ή Μέλος.
export function AddMemberForm({ productionId, choices }: AddMemberFormProps) {
  return (
    <ActionForm
      action={addProductionMember}
      submitLabel="Προσθήκη"
      pendingLabel="Προσθήκη…"
      variant="default"
    >
      <input type="hidden" name="productionId" value={productionId} />
      <Field label="Μέλος ομάδας">
        <Select name="userId" required defaultValue="">
          <option value="" disabled>
            Διάλεξε μέλος…
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

interface RemoveMemberFormProps {
  productionId: string;
  userId: string;
}

// Η αφαίρεση κόβει την πρόσβαση με την επόμενη ανάγνωση· η βάση δεν αφαιρεί τον Υπεύθυνο.
export function RemoveMemberForm({ productionId, userId }: RemoveMemberFormProps) {
  return (
    <ActionForm
      action={removeProductionMember}
      submitLabel="Αφαίρεση"
      pendingLabel="Αφαίρεση…"
      variant="danger"
      size="sm"
    >
      <input type="hidden" name="productionId" value={productionId} />
      <input type="hidden" name="userId" value={userId} />
    </ActionForm>
  );
}
