import { describe, expect, it } from "vitest";

import { formatTaskDue, sortTasks } from "./task-order";
import type { ProductionTask } from "./types";

function taskFactory(
  overrides: Partial<ProductionTask> & { id: string },
): ProductionTask {
  return {
    title: "Εργασία",
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    isLate: false,
    done: false,
    ...overrides,
  };
}

describe("formatTaskDue", () => {
  it("should show the due date as day, month and year", () => {
    expect(formatTaskDue("2027-03-01")).toBe("01/03/2027");
  });
});

describe("sortTasks", () => {
  it("should list open tasks before completed ones", () => {
    const tasks = [
      taskFactory({ id: "a", done: true }),
      taskFactory({ id: "b", done: false }),
      taskFactory({ id: "c", done: true }),
      taskFactory({ id: "d", done: false }),
    ];

    expect(sortTasks(tasks).map((task) => task.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("should keep the server order inside each group and not change the input", () => {
    const tasks = [taskFactory({ id: "x" }), taskFactory({ id: "y" })];

    expect(sortTasks(tasks).map((task) => task.id)).toEqual(["x", "y"]);
    expect(tasks.map((task) => task.id)).toEqual(["x", "y"]);
  });
});
