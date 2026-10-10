import { describe, expect, it } from "vitest";

import {
  addDays,
  mondayOf,
  monthGrid,
  rangeOf,
  shiftAnchor,
  titleOf,
} from "./date-range";

describe("mondayOf", () => {
  it("should return the Monday of the week, also for a Sunday", () => {
    expect(mondayOf("2026-10-11")).toBe("2026-10-05");
    expect(mondayOf("2026-10-05")).toBe("2026-10-05");
  });
});

describe("monthGrid", () => {
  it("should run from the Monday before the first day to the Sunday after the last", () => {
    const grid = monthGrid("2026-10-15");
    expect(grid[0]).toBe("2026-09-28");
    expect(grid[grid.length - 1]).toBe("2026-11-01");
    expect(grid).toHaveLength(35);
  });
});

describe("rangeOf", () => {
  it("should cover seven days for the week and thirty for the list", () => {
    expect(rangeOf("week", "2026-10-11")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(rangeOf("list", "2026-10-11")).toEqual({ from: "2026-10-11", to: "2026-11-09" });
  });
});

describe("shiftAnchor", () => {
  it("should move by a week, by a month keeping the day, and by thirty days in the list", () => {
    expect(shiftAnchor("week", "2026-10-11", 1)).toBe("2026-10-18");
    expect(shiftAnchor("month", "2026-10-31", -1)).toBe("2026-09-30");
    expect(shiftAnchor("list", "2026-10-11", -1)).toBe("2026-09-11");
    expect(addDays("2026-10-11", 1)).toBe("2026-10-12");
  });
});

describe("titleOf", () => {
  it("should name the month in Greek for the month view", () => {
    expect(titleOf("month", "2026-10-11")).toBe("Οκτώβριος 2026");
  });

  it("should write the range for the week view", () => {
    expect(titleOf("week", "2026-10-11")).toBe("05/10 – 11/10/2026");
  });
});
