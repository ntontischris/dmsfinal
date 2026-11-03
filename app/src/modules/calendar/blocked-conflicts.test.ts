import { describe, expect, it } from "vitest";

import { conflictLineOf } from "./blocked-conflicts";
import type { BlockedConflict } from "./types";

const conflict = (change: Partial<BlockedConflict> = {}): BlockedConflict => ({
  id: "00000000-0000-0000-0000-0000000000b1",
  title: "Κυψέλη Καφέ",
  startsAt: "2027-01-05T07:00:00Z",
  endsAt: "2027-01-05T09:00:00Z",
  state: "scheduled",
  ...change,
});

describe("conflictLineOf", () => {
  it("should show the day once when the filming ends the same Athens day", () => {
    const line = conflictLineOf(conflict());
    expect(line.title).toBe("Κυψέλη Καφέ");
    expect(line.when).toBe("05/01/2027, 09:00–11:00");
  });

  it("should link to the filming screen E3", () => {
    expect(conflictLineOf(conflict()).href).toBe("/app/filming/00000000-0000-0000-0000-0000000000b1");
  });

  it("should show both moments when the filming crosses midnight in Athens", () => {
    const line = conflictLineOf(conflict({ startsAt: "2027-01-05T20:00:00Z", endsAt: "2027-01-05T23:00:00Z" }));
    expect(line.when).toBe("05/01/2027, 22:00 – 06/01/2027, 01:00");
  });

  it("should name an untitled filming «Γύρισμα»", () => {
    expect(conflictLineOf(conflict({ title: null })).title).toBe("Γύρισμα");
  });
});
