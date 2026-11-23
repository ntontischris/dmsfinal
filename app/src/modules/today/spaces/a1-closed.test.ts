import { describe, expect, it } from "vitest";

import { closedNoteOf } from "./a1-closed";

describe("closedNoteOf", () => {
  it("should show the small count next to the list when lines remain", () => {
    expect(closedNoteOf({ closed: 3, remaining: 5 })).toBe("Έκλεισες 3");
  });

  it("should say how many were closed today when the list is empty", () => {
    expect(closedNoteOf({ closed: 7, remaining: 0 })).toBe("Έκλεισες 7 σήμερα");
  });

  it("should show nothing when nothing was closed", () => {
    expect(closedNoteOf({ closed: 0, remaining: 4 })).toBeNull();
    expect(closedNoteOf({ closed: 0, remaining: 0 })).toBeNull();
  });
});
