"use client";

import { Field, Input } from "@/components/ui/field";

import { updateDeliverable } from "../actions-deliverable";
import type { DeliverableCandidates, DeliverableCard } from "../types";

import { ActionForm } from "./action-form";
import { AssigneeSelect, FilmingSelect } from "./candidate-fields";

interface EditDeliverableFormProps {
  card: DeliverableCard;
  candidates: DeliverableCandidates;
}

// Επεξεργασία: τίτλος, υπεύθυνος και Γύρισμα. Η προθεσμία μένει όπως είναι.
export function EditDeliverableForm({ card, candidates }: EditDeliverableFormProps) {
  return (
    <ActionForm action={updateDeliverable} submitLabel="Αποθήκευση" pendingLabel="Αποθήκευση…" onlyWhenChanged>
      <input type="hidden" name="deliverableId" value={card.id} />
      <Field label="Τίτλος">
        <Input name="title" defaultValue={card.title} required maxLength={200} autoComplete="off" />
      </Field>
      <Field label="Υπεύθυνος">
        <AssigneeSelect assignees={candidates.assignees} defaultValue={card.assigneeId} />
      </Field>
      <Field label="Προθεσμία" hint="Κενό: μένει όπως είναι.">
        <Input name="deadline" type="date" defaultValue={card.deadline ?? ""} />
      </Field>
      <Field label="Γύρισμα">
        <FilmingSelect filmings={candidates.filmings} defaultValue={card.filmingId} />
      </Field>
    </ActionForm>
  );
}
