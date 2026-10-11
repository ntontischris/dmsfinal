"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import { toggleProductionTask } from "../actions-tasks";
import { formatTaskDue } from "../task-order";
import type { OwnerCandidate, ProductionTask } from "../types";

import { DeleteTaskConfirm, EditTaskForm } from "./task-forms";

interface TaskRowProps {
  task: ProductionTask;
  candidates: readonly OwnerCandidate[];
  canEdit: boolean;
}

// Μία Εργασία: checkbox «έγινε», τίτλος, υπεύθυνος, προθεσμία· επεξεργασία και διαγραφή μόνο όπου επιτρέπεται.
export function TaskRow({ task, candidates, canEdit }: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  return (
    <li className="grid gap-2 border-b border-border pb-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TaskCheckbox task={task} disabled={!canEdit} />
        {canEdit && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing((value) => !value)}
            >
              {isEditing ? "Κλείσιμο" : "Επεξεργασία"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirming(true)}
            >
              Διαγραφή
            </Button>
          </div>
        )}
      </div>
      <TaskMeta task={task} />
      {isEditing && <EditTaskForm task={task} candidates={candidates} />}
      {isConfirming && (
        <DeleteTaskConfirm
          taskId={task.id}
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </li>
  );
}

// Το «έγινε» αποθηκεύεται αμέσως· αν αποτύχει, το μήνυμα μένει δίπλα.
function TaskCheckbox({
  task,
  disabled,
}: {
  task: ProductionTask;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState>(INITIAL_FORM_STATE);
  const handleChange = (done: boolean) => {
    const form = new FormData();
    form.set("taskId", task.id);
    form.set("done", String(done));
    startTransition(async () => {
      setResult(await toggleProductionTask(INITIAL_FORM_STATE, form));
    });
  };
  return (
    <div className="grid gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={task.done}
          disabled={disabled || isPending}
          onChange={(event) => handleChange(event.currentTarget.checked)}
        />
        <span
          className={
            task.done ? "text-muted-foreground line-through" : undefined
          }
        >
          {task.title}
        </span>
      </label>
      <FormMessage state={result} />
    </div>
  );
}

function TaskMeta({ task }: { task: ProductionTask }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{task.assigneeName ?? "Χωρίς υπεύθυνο"}</span>
      {task.dueDate && <span>· έως {formatTaskDue(task.dueDate)}</span>}
      {task.isLate && !task.done && <Badge tone="attention">Καθυστερεί</Badge>}
    </div>
  );
}
