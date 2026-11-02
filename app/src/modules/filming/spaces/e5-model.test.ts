import { describe, expect, it } from "vitest";

import type { BookingDay } from "../booking-types";
import {
  bookingHintOf,
  bookingStepOf,
  dayLabel,
  dayStatusOf,
  dayViewsOf,
  groupDays,
  legendOf,
} from "./e5-model";

const day = (date: string, status: BookingDay["status"]): BookingDay => ({ day: date, status, label: "" });

describe("E5 model", () => {
  it("should turn the database status into plain client words", () => {
    expect(dayStatusOf("free", "2026-10-05", 48)).toEqual({ kind: "ok" });
    expect(dayStatusOf("too_soon", "2026-10-05", 48)).toMatchObject({ reason: "Πολύ κοντά", why: expect.stringContaining("48 ώρες") });
    expect(dayStatusOf("no_provision", "2026-10-05", 48)).toMatchObject({ reason: "Τελείωσαν", why: expect.stringContaining("Οκτώβριο") });
  });

  it("should label a day as weekday and day/month", () => {
    expect(dayLabel("2026-10-05")).toBe("Δευ 5/10");
  });

  it("should group days by month", () => {
    const groups = groupDays(dayViewsOf([day("2026-10-31", "free"), day("2026-11-01", "closed")], 48));
    expect(groups.map((g) => g.month)).toEqual(["Οκτώβριος 2026", "Νοέμβριος 2026"]);
  });

  it("should explain only the grey words that appear", () => {
    const legend = legendOf(dayViewsOf([day("2026-10-05", "free"), day("2026-10-06", "full")], 48));
    expect([...legend.keys()]).toEqual(["Γεμάτο"]);
  });

  it("should point to the first free day with the most common reason, ignoring closed days", () => {
    const views = dayViewsOf(
      [day("2026-10-04", "closed"), day("2026-10-05", "too_soon"), day("2026-10-06", "too_soon"), day("2026-10-07", "free")],
      48,
    );
    expect(bookingHintOf(views)).toEqual({ firstFree: "2026-10-07", why: expect.stringContaining("ειδοποίηση") });
    expect(bookingHintOf(dayViewsOf([day("2026-10-05", "free")], 48))).toBeNull();
  });

  it("should move through the four steps", () => {
    expect(bookingStepOf(null, null, null)).toBe(1);
    expect(bookingStepOf("2026-10-05", null, null)).toBe(2);
    expect(bookingStepOf("2026-10-05", 3, null)).toBe(3);
    expect(bookingStepOf("2026-10-05", 3, "10:00")).toBe(4);
  });
});
