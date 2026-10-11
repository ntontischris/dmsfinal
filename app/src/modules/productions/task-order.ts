import type { ProductionTask } from "./types";

// Οι ανοιχτές Εργασίες πρώτα, μετά οι ολοκληρωμένες· μέσα σε κάθε ομάδα η σειρά της βάσης μένει ίδια.
export function sortTasks(tasks: readonly ProductionTask[]): ProductionTask[] {
  return [...tasks].sort(
    (left, right) => Number(left.done) - Number(right.done),
  );
}

// Η προθεσμία ως dd/mm/yyyy (από το YYYY-MM-DD της βάσης).
export function formatTaskDue(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
