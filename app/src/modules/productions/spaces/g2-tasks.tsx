"use client";

import { useState } from "react";

import { fmtDate } from "@/spaces/screens/shared";

import { addProductionTask } from "../actions-tasks";
import { sortTasks } from "../task-order";
import type { OwnerCandidate, ProductionTask } from "../types";
import { taskSummary } from "./g2-model";
import { G2Box, G2Person } from "./g2-box";
import { RunResult, useRun } from "./g2-ui";
import {
  TaskPriorityBadge,
  TaskPrioritySelect,
  TaskStatusBadge,
  TaskStatusButtons,
} from "./task-controls";
import { canMoveTask } from "./task-model";

interface G2TasksProps {
  productionId: string;
  tasks: readonly ProductionTask[];
  people: readonly OwnerCandidate[];
  memberIds: readonly string[];
  meId: string;
  canEdit: boolean;
  isOpen: boolean;
}

function AddTask({
  productionId,
  people,
  memberIds,
  meId,
}: Omit<G2TasksProps, "tasks" | "canEdit" | "isOpen">) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(
    people.some((person) => person.id === meId) ? meId : "",
  );
  const [due, setDue] = useState("");
  const add = useRun(addProductionTask);
  const submit = () =>
    add.run(
      { productionId, title: title.trim(), assigneeId: assignee, dueDate: due },
      (state) => {
        if (state.error) return;
        setTitle("");
        setDue("");
      },
    );
  return (
    <>
      <div className="g2-add ml-quick">
        <input
          className="input"
          placeholder="Τίτλος εργασίας (υποχρεωτικός)"
          aria-label="Τίτλος εργασίας"
          aria-required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <select
          className="input"
          aria-label="Ανατεθειμένος"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        >
          <option value="">Χωρίς υπεύθυνο</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          aria-label="Προθεσμία (προαιρετική)"
          value={due}
          onChange={(event) => setDue(event.target.value)}
        />
        <button
          type="button"
          disabled={title.trim() === "" || add.isPending}
          onClick={submit}
        >
          Προσθήκη εργασίας
        </button>
        {assignee !== "" && !memberIds.includes(assignee) && (
          <span className="muted">Θα γίνει Μέλος με την ανάθεση.</span>
        )}
      </div>
      <RunResult result={add.result} />
    </>
  );
}

function TaskLine({
  task,
  canEdit,
  canMove,
}: {
  task: ProductionTask;
  canEdit: boolean;
  canMove: boolean;
}) {
  return (
    <li className="g2-task" data-done={task.done} data-status={task.status}>
      <span className="g2-check" data-done={task.done} aria-hidden="true" />
      <span className="g2-title">{task.title}</span>
      <div className="g2-signals ml-quick">
        {task.assigneeName && <G2Person name={task.assigneeName} />}
        {task.dueDate && (
          <span className="muted">προθεσμία {fmtDate(task.dueDate)}</span>
        )}
        {task.isLate && (
          <span className="ml-tag" data-tone="warn">
            εκπρόθεσμη
          </span>
        )}
        <TaskPriorityBadge priority={task.priority} />
        <TaskStatusBadge status={task.status} />
        {canEdit && !task.done && (
          <TaskPrioritySelect taskId={task.id} priority={task.priority} />
        )}
        {canMove && <TaskStatusButtons taskId={task.id} status={task.status} />}
      </div>
    </li>
  );
}

// Οι Εργασίες της Παραγωγής (prototype `g2-tasks.tsx`) πάνω στις πραγματικές ενέργειες. Αλλαγές μόνο σε ανοιχτή Παραγωγή
// και σε όποιον τη διαχειρίζεται (όπως η βάση).
export function G2Tasks(props: G2TasksProps) {
  const { tasks, canEdit, isOpen, meId } = props;
  return (
    <G2Box title="Εργασίες" hint={taskSummary(tasks)}>
      <p className="muted">
        Απλή εσωτερική υποχρέωση της Παραγωγής: τίτλος, ένας Ανατεθειμένος,
        προαιρετική προθεσμία και προτεραιότητα. Ο υπεύθυνος τη βλέπει στο «Οι
        εργασίες μου». Ο πελάτης δεν τις βλέπει και δεν εμποδίζουν την παράδοση.
      </p>
      {tasks.length === 0 && (
        <p className="muted">Η Παραγωγή δεν έχει ακόμα εργασίες.</p>
      )}
      <ul className="g2-tasks">
        {sortTasks(tasks).map((task) => (
          <TaskLine
            key={task.id}
            task={task}
            canEdit={canEdit}
            canMove={canMoveTask({
              canEdit,
              isOpen,
              isMine: meId !== "" && task.assigneeId === meId,
            })}
          />
        ))}
      </ul>
      {canEdit && <AddTask {...props} />}
    </G2Box>
  );
}
