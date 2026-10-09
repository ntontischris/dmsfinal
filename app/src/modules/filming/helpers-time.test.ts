import { describe, expect, it } from "vitest";

import { athensDate, athensTime, athensToIso, formatHours } from "./helpers-time";

describe("athensToIso", () => {
  it("should read the wall clock of Athens in winter as UTC plus two hours", () => {
    expect(athensToIso("2026-01-15", "10:30")).toBe("2026-01-15T08:30:00.000Z");
  });

  it("should read the wall clock of Athens in summer as UTC plus three hours", () => {
    expect(athensToIso("2026-07-15", "10:30")).toBe("2026-07-15T07:30:00.000Z");
  });

  it("should keep the Athens date when the UTC instant falls on the day before", () => {
    expect(athensToIso("2026-10-09", "00:15")).toBe("2026-10-08T21:15:00.000Z");
  });
});

describe("athensDate and athensTime", () => {
  it("should show the Athens day of an instant that is already the next day in Athens", () => {
    expect(athensDate("2026-10-08T22:30:00.000Z")).toBe("2026-10-09");
  });

  it("should show the Athens clock time of an instant", () => {
    expect(athensTime("2026-10-09T06:45:00.000Z")).toBe("09:45");
  });
});

describe("formatHours", () => {
  it("should write whole hours plainly and halves with a Greek decimal comma", () => {
    expect(formatHours(3)).toBe("3");
    expect(formatHours(2.5)).toBe("2,5");
  });
});
