import { describe, expect, it } from "vitest";

import { closedNotesOf } from "./a1-closed";

describe("closedNotesOf", () => {
  it("should show the small count next to the list when lines remain", () => {
    expect(closedNotesOf({ closed: 3, later: 2, remaining: 5 })).toEqual([
      "Έκλεισες 3",
    ]);
  });

  it("should show nothing while lines remain and nothing was closed", () => {
    expect(closedNotesOf({ closed: 0, later: 0, remaining: 4 })).toEqual([]);
  });

  it("should say how many were closed today when the list is empty", () => {
    expect(closedNotesOf({ closed: 7, later: 0, remaining: 0 })).toEqual([
      "Έκλεισες 7 σήμερα",
    ]);
  });

  it("should add the lines that come back tomorrow when the list is empty", () => {
    expect(closedNotesOf({ closed: 7, later: 2, remaining: 0 })).toEqual([
      "Έκλεισες 7 σήμερα",
      "2 ξαναβγαίνουν αύριο το πρωί",
    ]);
  });

  it("should show only the tomorrow line when nothing was closed but some were postponed", () => {
    expect(closedNotesOf({ closed: 0, later: 1, remaining: 0 })).toEqual([
      "1 ξαναβγαίνουν αύριο το πρωί",
    ]);
  });

  it("should show nothing when the list is empty and nothing happened", () => {
    expect(closedNotesOf({ closed: 0, later: 0, remaining: 0 })).toEqual([]);
  });
});
