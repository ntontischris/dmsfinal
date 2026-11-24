import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtDate,
} from "@/spaces/screens/shared";

import { listMyTasks } from "../queries";
import type { MyTask } from "../types";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskStatusButtons,
} from "./task-controls";
import { G2Box } from "./g2-box";
import { groupByStatus } from "./task-model";

import "../../finance/spaces/money-lines.css";
import "./g4.css";

const subOf = (task: MyTask): string =>
  [
    task.production.title,
    task.clientName ?? "Εσωτερική",
    task.dueDate && `προθεσμία ${fmtDate(task.dueDate)}`,
  ]
    .filter(Boolean)
    .join(" · ");

// Μία Εργασία ως γραμμή (.ml-line): ο τίτλος ανοίγει την Παραγωγή, δεξιά τα σήματα και η επόμενη κατάσταση.
function TaskLine({ task }: { task: MyTask }) {
  return (
    <li
      className="ml-line"
      data-urgent={task.isLate ? "" : undefined}
      data-faded={task.status === "done" ? "true" : undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(task.production.title)}
      </span>
      <span className="ml-main">
        <strong>
          {task.production.canOpen ? (
            <Link href={hrefOf("G2", { id: task.production.id })}>
              {task.title}
            </Link>
          ) : (
            task.title
          )}
        </strong>
        <small>{subOf(task)}</small>
      </span>
      <span className="ml-quick g4-aside" data-task={task.id}>
        {task.isLate && <Badge tone="attention">εκπρόθεσμη</Badge>}
        <TaskPriorityBadge priority={task.priority} />
        <TaskStatusBadge status={task.status} />
        <TaskStatusButtons taskId={task.id} status={task.status} />
      </span>
    </li>
  );
}

function NoTasks() {
  return (
    <StateNotice kind="empty" title="Δεν έχεις ανοιχτές εργασίες">
      <p>
        Όταν σου αναθέσουν Εργασία σε μια Παραγωγή, θα τη βρεις εδώ και θα
        ειδοποιηθείς. <Link href={hrefOf("G1")}>Στις Παραγωγές</Link>
      </p>
    </StateNotice>
  );
}

// G4 «Οι εργασίες μου»: οι Εργασίες που έχουν ανατεθεί στον θεατή, σε ανοιχτές Παραγωγές. Απαντά στο «τι έχω να κάνω;»:
// ό,τι τρέχει πρώτο, μετά ό,τι περιμένει (υψηλή προτεραιότητα και προθεσμία πρώτα, όπως τα δίνει η βάση).
// Μία ομάδα = ένα ανοιχτό κουτί· το h1 «Οι εργασίες μου» το γράφει το κέλυφος (στοιχείο του NAV).
export async function SpacesMyTasks() {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in" || viewer.team === null)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τις εργασίες τις βλέπουν οι Χρήστες της ομάδας.</p>
        </StateNotice>
      </div>
    );
  const read = await listMyTasks();
  if (!read.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="οι εργασίες σου" />
      </div>
    );
  const groups = groupByStatus(read.data);
  return (
    <div data-spaces className="g4">
      {groups.length === 0 ? (
        <NoTasks />
      ) : (
        <div className="ml-stack">
          {groups.map((group) => (
            <G2Box
              key={group.label}
              title={group.label}
              hint={`${group.tasks.length} Εργασίες`}
              isOpen
            >
              <ul className="ml-list">
                {group.tasks.map((task) => (
                  <TaskLine key={task.id} task={task} />
                ))}
              </ul>
            </G2Box>
          ))}
        </div>
      )}
    </div>
  );
}
