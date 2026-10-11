"use client";

import { useState } from "react";

import { Field, Input, Select } from "@/components/ui/field";

import { createDeliverable } from "../actions-deliverable";
import type { DeliverableCandidates, KindCandidate } from "../types";

import { ActionForm } from "./action-form";
import { AssigneeSelect, FilmingSelect } from "./candidate-fields";
import { TextArea } from "./form-fields";

interface NewDeliverableFormProps {
  productionId: string;
  defaultTitle: string;
  isInternal: boolean;
  candidates: DeliverableCandidates;
}

// Νέο Παραδοτέο: είδος με υπόλοιπο, τίτλος, υπεύθυνος, Γύρισμα. Χωρίς υπόλοιπο, ζητά «χωρίς χρέωση» με λόγο ή «να αποφασιστεί».
export function NewDeliverableForm({ productionId, defaultTitle, isInternal, candidates }: NewDeliverableFormProps) {
  const [kindId, setKindId] = useState(candidates.kinds[0]?.id ?? "");
  const kind = candidates.kinds.find((item) => item.id === kindId);
  const needsCharge = !isInternal && (kind?.balance ?? 0) <= 0;
  return (
    <ActionForm action={createDeliverable} submitLabel="Δημιουργία" pendingLabel="Δημιουργία…">
      <input type="hidden" name="productionId" value={productionId} />
      <Field label="Είδος">
        <Select name="kindId" value={kindId} onChange={(event) => setKindId(event.target.value)}>
          {candidates.kinds.map((item) => (
            <option key={item.id} value={item.id}>
              {kindOptionLabel(item, isInternal)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Τίτλος">
        <Input name="title" defaultValue={defaultTitle} required maxLength={200} autoComplete="off" />
      </Field>
      <Field label="Υπεύθυνος">
        <AssigneeSelect assignees={candidates.assignees} defaultValue={null} />
      </Field>
      <Field label="Γύρισμα">
        <FilmingSelect filmings={candidates.filmings} defaultValue={null} />
      </Field>
      {needsCharge && <ChargeFields />}
    </ActionForm>
  );
}

const kindOptionLabel = (kind: KindCandidate, isInternal: boolean): string =>
  isInternal || kind.balance === null ? kind.label : `${kind.label} · υπόλοιπο ${kind.balance}`;

// Χωρίς υπόλοιπο: χρέωση ή «χωρίς χρέωση» με λόγο. Με υπόλοιπο, τα πεδία δεν εμφανίζονται.
function ChargeFields() {
  return (
    <>
      <Field label="Χρέωση (το είδος δεν έχει υπόλοιπο)">
        <Select name="charge" defaultValue="pending">
          <option value="pending">Να αποφασιστεί χρέωση</option>
          <option value="free">Χωρίς χρέωση</option>
        </Select>
      </Field>
      <Field label="Λόγος, αν είναι χωρίς χρέωση">
        <TextArea name="chargeReason" rows={2} />
      </Field>
    </>
  );
}
