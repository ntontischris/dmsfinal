"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

import {
  addProductionTask,
  deleteProductionTask,
  updateProductionTask,
} from "../actions-tasks";
import type { OwnerCandidate, ProductionTask } from "../types";

import { ActionForm } from "./action-form";

interface TaskFieldsProps {
  candidates: readonly OwnerCandidate[];
  title?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}

// Τα τρία πεδία μιας Εργασίας: τίτλος, υπεύθυνος (από τα Μέλη), προθεσμία (προαιρετική).
function TaskFields({
  candidates,
  title = "",
  assigneeId = null,
  dueDate = null,
}: TaskFieldsProps) {
  return (
    <>
      <Field label="Τίτλος">
        <Input name="title" defaultValue={title} required maxLength={200} />
      </Field>
      <Field label="Υπεύθυνος">
        <Select name="assigneeId" defaultValue={assigneeId ?? ""}>
          <option value="">Χωρίς υπεύθυνο</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Προθεσμία">
        <Input type="date" name="dueDate" defaultValue={dueDate ?? ""} />
      </Field>
    </>
  );
}

interface AddTaskFormProps {
  productionId: string;
  candidates: readonly OwnerCandidate[];
}

// Νέα Εργασία. Μετά την προσθήκη η φόρμα καθαρίζει.
export function AddTaskForm({ productionId, candidates }: AddTaskFormProps) {
  return (
    <ActionForm
      action={addProductionTask}
      submitLabel="Προσθήκη Εργασίας"
      pendingLabel="Προσθήκη…"
      resetOnSuccess
    >
      <input type="hidden" name="productionId" value={productionId} />
      <TaskFields candidates={candidates} />
    </ActionForm>
  );
}

interface EditTaskFormProps {
  task: ProductionTask;
  candidates: readonly OwnerCandidate[];
}

// Επεξεργασία: το κουμπί εμφανίζεται μόνο όταν κάτι άλλαξε.
export function EditTaskForm({ task, candidates }: EditTaskFormProps) {
  return (
    <ActionForm
      action={updateProductionTask}
      submitLabel="Αποθήκευση"
      pendingLabel="Αποθήκευση…"
      onlyWhenChanged
    >
      <input type="hidden" name="taskId" value={task.id} />
      <TaskFields
        candidates={candidates}
        title={task.title}
        assigneeId={task.assigneeId}
        dueDate={task.dueDate}
      />
    </ActionForm>
  );
}

interface DeleteTaskConfirmProps {
  taskId: string;
  onCancel: () => void;
}

// Διαγραφή με επιβεβαίωση στην ίδια γραμμή: «Να διαγραφεί;» και δύο κουμπιά.
export function DeleteTaskConfirm({
  taskId,
  onCancel,
}: DeleteTaskConfirmProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>Να διαγραφεί η Εργασία;</span>
      <ActionForm
        action={deleteProductionTask}
        submitLabel="Διαγραφή"
        pendingLabel="Διαγραφή…"
        variant="danger"
        size="sm"
        className="inline-grid"
      >
        <input type="hidden" name="taskId" value={taskId} />
      </ActionForm>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Άκυρο
      </Button>
    </div>
  );
}
