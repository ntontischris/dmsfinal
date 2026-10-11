import { Panel } from "@/components/ui/panel";

import { sortTasks } from "../task-order";
import type { OwnerCandidate, ProductionDetail } from "../types";

import { MutedNote } from "./form-fields";
import { AddTaskForm } from "./task-forms";
import { TaskRow } from "./task-row";

interface TasksPanelProps {
  production: ProductionDetail;
  candidates: readonly OwnerCandidate[];
}

const NO_TASK_NOTE =
  "Καμία Εργασία ακόμα. Κάθε Εργασία έχει τίτλο, έναν υπεύθυνο και προαιρετική προθεσμία.";

// Οι Εργασίες της Παραγωγής (G2). Ο πελάτης δεν τις βλέπει. Αλλαγές μόνο σε ανοιχτή Παραγωγή και σε όποιον τη διαχειρίζεται.
export function TasksPanel({ production, candidates }: TasksPanelProps) {
  const canEdit = production.viewerCan.members && production.state === "open";
  const tasks = sortTasks(production.tasks);
  return (
    <Panel label="Εργασίες">
      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <MutedNote>{NO_TASK_NOTE}</MutedNote>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 text-sm">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                candidates={candidates}
                canEdit={canEdit}
              />
            ))}
          </ul>
        )}
        {canEdit && (
          <AddTaskForm productionId={production.id} candidates={candidates} />
        )}
      </div>
    </Panel>
  );
}
