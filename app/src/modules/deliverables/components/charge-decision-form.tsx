"use client";

import { useState } from "react";

import { Field, Select } from "@/components/ui/field";

import { decideDeliverableCharge } from "../actions-deliverable";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface ChargeDecisionFormProps {
  deliverableId: string;
}

// Η απόφαση χρέωσης (μόνο finance.cost): «Χρεώνεται» ή «Χωρίς χρέωση» με λόγο. Η βάση ξαναελέγχει.
export function ChargeDecisionForm({ deliverableId }: ChargeDecisionFormProps) {
  const [charge, setCharge] = useState("charged");
  return (
    <ActionForm action={decideDeliverableCharge} submitLabel="Απόφαση" pendingLabel="Απόφαση…">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <Field label="Χρέωση">
        <Select name="charge" value={charge} onChange={(event) => setCharge(event.target.value)}>
          <option value="charged">Χρεώνεται</option>
          <option value="free">Χωρίς χρέωση</option>
        </Select>
      </Field>
      {charge === "free" && (
        <Field label="Λόγος (υποχρεωτικός)">
          <TextArea name="reason" rows={2} required />
        </Field>
      )}
    </ActionForm>
  );
}
