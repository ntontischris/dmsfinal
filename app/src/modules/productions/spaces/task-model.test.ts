import { describe, expect, it } from "vitest";

import { canMoveTask, groupByStatus, statusMovesOf } from "./task-model";

describe("statusMovesOf", () => {
  it("should offer start and done for a task still to do", () => {
    expect(statusMovesOf("todo").map((move) => move.label)).toEqual([
      "Ξεκίνησα",
      "Έγινε",
    ]);
  });

  it("should offer only done for a task in progress", () => {
    expect(statusMovesOf("doing")).toEqual([{ status: "done", label: "Έγινε" }]);
  });

  it("should offer reopen for a done task", () => {
    expect(statusMovesOf("done")).toEqual([
      { status: "todo", label: "Ξανάνοιγμα" },
    ]);
  });
});

describe("canMoveTask", () => {
  it("should let the production manager move any task", () => {
    expect(canMoveTask({ canEdit: true, isOpen: true, isMine: false })).toBe(true);
  });

  it("should let the assignee move their own task in an open production", () => {
    expect(canMoveTask({ canEdit: false, isOpen: true, isMine: true })).toBe(true);
  });

  it("should not let the assignee move a task of a closed production", () => {
    expect(canMoveTask({ canEdit: false, isOpen: false, isMine: true })).toBe(false);
  });

  it("should not let others move the task", () => {
    expect(canMoveTask({ canEdit: false, isOpen: true, isMine: false })).toBe(false);
  });
});

describe("groupByStatus", () => {
  const task = (id: string, status: "todo" | "doing" | "done") => ({ id, status });

  it("should put tasks in progress first and done ones last, keeping order", () => {
    const groups = groupByStatus([
      task("a", "todo"),
      task("b", "done"),
      task("c", "doing"),
      task("d", "todo"),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "Σε εξέλιξη",
      "Να γίνουν",
      "Έγιναν τις τελευταίες 7 μέρες",
    ]);
    expect(groups[1].tasks.map((item) => item.id)).toEqual(["a", "d"]);
  });

  it("should leave out empty groups", () => {
    expect(groupByStatus([task("a", "todo")]).map((group) => group.label)).toEqual([
      "Να γίνουν",
    ]);
  });
});
