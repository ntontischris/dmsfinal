"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar } from "@/spaces/kit/parts";
import { fmtDate } from "@/spaces/screens/shared";

import { addProductionTask, toggleProductionTask } from "../actions-tasks";
import { sortTasks } from "../task-order";
import type { OwnerCandidate, ProductionTask } from "../types";
import { taskSummary } from "./g2-model";
import { RunResult, useRun } from "./g2-ui";

interface G2TasksProps {
  productionId: string;
  tasks: readonly ProductionTask[];
  people: readonly OwnerCandidate[];
  memberIds: readonly string[];
  meId: string;
  canEdit: boolean;
}

function AddTask({
  productionId,
  people,
  memberIds,
  meId,
}: Omit<G2TasksProps, "tasks" | "canEdit">) {
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
      <div className="g2-add">
        <input
          className="input"
          placeholder="Τίτλος εργασίας (υποχρεωτικός)"
          aria-label="Τίτλος εργασίας"
          aria-required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <select
          className="select"
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
          className="button"
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
}: {
  task: ProductionTask;
  canEdit: boolean;
}) {
  const toggle = useRun(toggleProductionTask);
  return (
    <li className="g2-task" data-done={task.done}>
      <span className="g2-check" data-done={task.done} aria-hidden="true" />
      <span className="g2-title">{task.title}</span>
      <div className="g2-signals">
        {task.assigneeName && <Avatar name={task.assigneeName} size={24} />}
        {task.dueDate && (
          <span className="muted">προθεσμία {fmtDate(task.dueDate)}</span>
        )}
        {task.isLate && (
          <span className="badge" data-tone="attention">
            εκπρόθεσμη
          </span>
        )}
        {task.done && <span className="badge">έγινε</span>}
        {canEdit && (
          <button
            type="button"
            className="button"
            disabled={toggle.isPending}
            onClick={() =>
              toggle.run({ taskId: task.id, done: String(!task.done) })
            }
          >
            {task.done ? "Ξανάνοιγμα" : "Έγινε"}
          </button>
        )}
      </div>
      {toggle.result.error && <RunResult result={toggle.result} />}
    </li>
  );
}

// Οι Εργασίες της Παραγωγής (prototype `g2-tasks.tsx`) πάνω στις πραγματικές ενέργειες. Αλλαγές μόνο σε ανοιχτή Παραγωγή
// και σε όποιον τη διαχειρίζεται (όπως η βάση).
export function G2Tasks(props: G2TasksProps) {
  const { tasks, canEdit } = props;
  return (
    <Panel label="Εργασίες" aside={taskSummary(tasks)}>
      <p className="muted">
        Απλή εσωτερική υποχρέωση της Παραγωγής: τίτλος, ένας Ανατεθειμένος,
        προαιρετική προθεσμία, έγινε ή όχι. Ο πελάτης δεν τις βλέπει και δεν
        εμποδίζουν την παράδοση.
      </p>
      {tasks.length === 0 && (
        <p className="muted">Η Παραγωγή δεν έχει ακόμα εργασίες.</p>
      )}
      <ul className="g2-tasks">
        {sortTasks(tasks).map((task) => (
          <TaskLine key={task.id} task={task} canEdit={canEdit} />
        ))}
      </ul>
      {canEdit && <AddTask {...props} />}
    </Panel>
  );
}
