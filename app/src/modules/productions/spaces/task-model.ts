import type { TaskStatus } from "../types";

// Λογική των χειριστηρίων Εργασίας (G2, G4), χωρίς React ώστε να ελέγχεται με vitest.

export interface StatusMove {
  status: TaskStatus;
  label: string;
}

const MOVES: Readonly<Record<TaskStatus, readonly StatusMove[]>> = {
  todo: [
    { status: "doing", label: "Ξεκίνησα" },
    { status: "done", label: "Έγινε" },
  ],
  doing: [{ status: "done", label: "Έγινε" }],
  done: [{ status: "todo", label: "Ξανάνοιγμα" }],
};

// Οι επόμενες καταστάσεις από την τωρινή.
export const statusMovesOf = (status: TaskStatus): readonly StatusMove[] =>
  MOVES[status];

// Την κατάσταση την αλλάζει όποιος διαχειρίζεται την ανοιχτή Παραγωγή και ο ίδιος ο υπεύθυνος της Εργασίας.
export const canMoveTask = (options: {
  canEdit: boolean;
  isOpen: boolean;
  isMine: boolean;
}): boolean => options.canEdit || (options.isOpen && options.isMine);

// Οι ομάδες του «Οι εργασίες μου»: πρώτα ό,τι τρέχει, μετά ό,τι περιμένει, στο τέλος όσα έγιναν πρόσφατα.
const GROUPS: readonly { status: TaskStatus; label: string }[] = [
  { status: "doing", label: "Σε εξέλιξη" },
  { status: "todo", label: "Να γίνουν" },
  { status: "done", label: "Έγιναν τις τελευταίες 7 μέρες" },
];

export function groupByStatus<T extends { status: TaskStatus }>(
  tasks: readonly T[],
): { label: string; tasks: T[] }[] {
  return GROUPS.map((group) => ({
    label: group.label,
    tasks: tasks.filter((task) => task.status === group.status),
  })).filter((group) => group.tasks.length > 0);
}
