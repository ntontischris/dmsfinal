import { describe, expect, it } from "vitest";

import {
  agoText,
  athensAt,
  athensDay,
  laterOptions,
  startOfToday,
} from "./athens-time";

const HOUR = 3_600_000;
// Κυριακή 15/11/2026, 12:00 Αθήνα (UTC+2).
const SUNDAY_NOON = Date.UTC(2026, 10, 15, 10);

describe("athens time", () => {
  it("should place 09:00 Athens in winter and summer", () => {
    expect(athensAt("2026-11-16", 9)).toBe(Date.UTC(2026, 10, 16, 7));
    expect(athensAt("2026-07-01", 9)).toBe(Date.UTC(2026, 6, 1, 6));
  });

  it("should read the Athens day across UTC midnight", () => {
    expect(athensDay(Date.UTC(2026, 10, 15, 23))).toBe("2026-11-16");
    expect(startOfToday(SUNDAY_NOON)).toBe(Date.UTC(2026, 10, 14, 22));
  });

  it("should offer three hours, tomorrow and next Monday", () => {
    expect(laterOptions(SUNDAY_NOON)).toEqual([
      { label: "Σε 3 ώρες", until: SUNDAY_NOON + 3 * HOUR },
      { label: "Αύριο 09:00", until: Date.UTC(2026, 10, 16, 7) },
      { label: "Δευτέρα 09:00", until: Date.UTC(2026, 10, 16, 7) },
    ]);
  });

  it("should never offer today's Monday", () => {
    const mondayNoon = Date.UTC(2026, 10, 16, 10);
    expect(laterOptions(mondayNoon)[2].until).toBe(Date.UTC(2026, 10, 23, 7));
  });

  it("should say how long ago with Greek singulars", () => {
    expect(agoText(SUNDAY_NOON, SUNDAY_NOON)).toBe("μόλις τώρα");
    expect(agoText(SUNDAY_NOON - 60_000, SUNDAY_NOON)).toBe("πριν από 1 λεπτό");
    expect(agoText(SUNDAY_NOON - 3 * HOUR, SUNDAY_NOON)).toBe(
      "πριν από 3 ώρες",
    );
    expect(agoText(SUNDAY_NOON - 24 * HOUR, SUNDAY_NOON)).toBe(
      "πριν από 1 μέρα",
    );
  });
});
