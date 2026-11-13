import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Due, GroupBand, ListRow, RowList } from "@/spaces/kit/parts";
import { ErrorNotice, StateNotice, fmtDate } from "@/spaces/screens/shared";

import { listMyTasks } from "../queries";
import type { MyTask } from "../types";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskStatusButtons,
} from "./task-controls";
import { groupByStatus } from "./task-model";

import "./g4.css";

const subOf = (task: MyTask) => (
  <>
    {[task.production.title, task.clientName ?? "Εσωτερική"].join(" · ")}
    {task.dueDate && (
      <>
        {" · "}
        <Due isLate={task.isLate}>προθεσμία {fmtDate(task.dueDate)}</Due>
      </>
    )}
  </>
);

function TaskRow({ task }: { task: MyTask }) {
  return (
    <ListRow
      title={task.title}
      href={
        task.production.canOpen
          ? hrefOf("G2", { id: task.production.id })
          : undefined
      }
      sub={subOf(task)}
      isFaded={task.status === "done"}
      aside={
        <span className="g4-aside" data-task={task.id}>
          {task.isLate && <span className="badge" data-tone="attention">εκπρόθεσμη</span>}
          <TaskPriorityBadge priority={task.priority} />
          <TaskStatusBadge status={task.status} />
          <TaskStatusButtons taskId={task.id} status={task.status} />
        </span>
      }
    />
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
    <div data-spaces>
      <header className="page-head">
        <h1>
          Οι εργασίες μου<span className="page-head-dot">.</span>
        </h1>
      </header>
      {groups.length === 0 ? (
        <NoTasks />
      ) : (
        <Panel label="Οι εργασίες μου" aside={read.data.length} isFlush>
          <RowList>
            {groups.flatMap((group) => [
              <GroupBand
                key={`band-${group.label}`}
                label={group.label}
                aside={group.tasks.length}
              />,
              ...group.tasks.map((task) => <TaskRow key={task.id} task={task} />),
            ])}
          </RowList>
        </Panel>
      )}
    </div>
  );
}
