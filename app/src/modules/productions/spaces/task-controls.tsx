"use client";

import { Badge } from "@/spaces/screens/shared";

import {
  setProductionTaskPriority,
  setProductionTaskStatus,
} from "../actions-tasks";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "../labels";
import { TASK_PRIORITIES, type TaskPriority, type TaskStatus } from "../types";
import { RunResult, useRun } from "./g2-ui";
import { statusMovesOf } from "./task-model";

// Τα χειριστήρια μιας Εργασίας, κοινά στη Σελίδα Παραγωγής (G2) και στο «Οι εργασίες μου» (G4).

// Η κατάσταση ως χάπι· «να γίνει» δεν χρειάζεται σήμα.
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  if (status === "todo") return null;
  return (
    <Badge tone={status === "done" ? "ok" : "waiting"}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

// Η προτεραιότητα φαίνεται μόνο όταν δεν είναι η κανονική.
export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "normal") return null;
  return (
    <Badge tone={priority === "high" ? "attention" : "faded"}>
      {`${TASK_PRIORITY_LABELS[priority]} προτεραιότητα`}
    </Badge>
  );
}

// Τα κουμπιά της επόμενης κατάστασης: «Ξεκίνησα», «Έγινε», «Ξανάνοιγμα».
export function TaskStatusButtons({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const move = useRun(setProductionTaskStatus);
  return (
    <>
      {statusMovesOf(status).map((next) => (
        <button
          key={next.status}
          type="button"
          className="button"
          disabled={move.isPending}
          onClick={() => move.run({ taskId, status: next.status })}
        >
          {next.label}
        </button>
      ))}
      {move.result.error && <RunResult result={move.result} />}
    </>
  );
}

// Επιλογή προτεραιότητας (μόνο όποιος διαχειρίζεται την Παραγωγή).
export function TaskPrioritySelect({
  taskId,
  priority,
}: {
  taskId: string;
  priority: TaskPriority;
}) {
  const save = useRun(setProductionTaskPriority);
  return (
    <>
      <select
        className="select"
        aria-label="Προτεραιότητα"
        value={priority}
        disabled={save.isPending}
        onChange={(event) => save.run({ taskId, priority: event.target.value })}
      >
        {TASK_PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {TASK_PRIORITY_LABELS[value]}
          </option>
        ))}
      </select>
      {save.result.error && <RunResult result={save.result} />}
    </>
  );
}
