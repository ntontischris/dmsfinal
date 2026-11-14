import { describe, expect, it } from "vitest";

import type { BookingHoursView, BookingWeekDay } from "../booking-types";
import {
  firstFreeTime,
  firstWorkingSlot,
  startSlotOf,
  windowOn,
} from "./e4-start";

const weekday = (dow: number): BookingWeekDay => ({
  dow,
  isOpen: dow <= 5,
  opens: dow <= 5 ? "10:00" : null,
  closes: dow <= 5 ? "18:00" : null,
});

const hours = (overrides: Partial<BookingHoursView> = {}) => ({
  isSet: true,
  week: [1, 2, 3, 4, 5, 6, 7].map(weekday),
  exceptions: [],
  holidays: [],
  ...overrides,
});

// 2026-11-14 = Σάββατο, 2026-11-16 = Δευτέρα, 2026-11-17 = Τρίτη.
describe("firstWorkingSlot", () => {
  it("should skip the weekend to the next open day at its opening hour", () => {
    expect(
      firstWorkingSlot(hours(), { date: "2026-11-14", time: "08:00" }),
    ).toEqual({
      date: "2026-11-16",
      time: "10:00",
    });
  });

  it("should never propose today, even before the hours open", () => {
    expect(
      firstWorkingSlot(hours(), { date: "2026-11-16", time: "09:00" }),
    ).toEqual({
      date: "2026-11-17",
      time: "10:00",
    });
    expect(
      firstWorkingSlot(hours(), { date: "2026-11-16", time: "12:00" }),
    ).toEqual({
      date: "2026-11-17",
      time: "10:00",
    });
  });

  it("should skip a closed exception and a closed holiday", () => {
    const closed = hours({
      exceptions: [
        {
          day: "2026-11-16",
          isClosed: true,
          opens: null,
          closes: null,
          capacity: null,
          note: null,
        },
      ],
      holidays: [
        {
          day: "2026-11-17",
          name: "Αργία",
          movable: false,
          isOpen: false,
          isOpened: false,
          isPast: false,
        },
      ],
    });
    expect(
      firstWorkingSlot(closed, { date: "2026-11-14", time: "08:00" })?.date,
    ).toBe("2026-11-18");
  });

  it("should use the exception's own opening hour", () => {
    const late = hours({
      exceptions: [
        {
          day: "2026-11-16",
          isClosed: false,
          opens: "13:00",
          closes: "18:00",
          capacity: null,
          note: null,
        },
      ],
    });
    expect(
      firstWorkingSlot(late, { date: "2026-11-14", time: "08:00" }),
    ).toEqual({
      date: "2026-11-16",
      time: "13:00",
    });
  });

  it("should fall back to weekdays at 09:00 when the hours are not set", () => {
    expect(
      firstWorkingSlot(hours({ isSet: false, week: [] }), {
        date: "2026-11-14",
        time: "08:00",
      }),
    ).toEqual({ date: "2026-11-16", time: "09:00" });
  });

  it("should give nothing when every day is closed", () => {
    const shut = hours({
      week: [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
        ...weekday(dow),
        isOpen: false,
      })),
    });
    expect(
      firstWorkingSlot(shut, { date: "2026-11-14", time: "08:00" }),
    ).toBeNull();
  });
});

describe("startSlotOf", () => {
  it("should skip a Saturday to Monday even when the hours could not be read", () => {
    expect(startSlotOf(null, { date: "2026-11-14", time: "10:30" })).toEqual({
      date: "2026-11-16",
      time: "09:00",
    });
  });

  it("should follow the owner's hours when they are read", () => {
    expect(
      startSlotOf(hours(), { date: "2026-11-14", time: "10:30" }),
    ).toEqual({ date: "2026-11-16", time: "10:00" });
  });
});

describe("windowOn", () => {
  it("should give the opening and closing hour of an open day", () => {
    expect(windowOn(hours(), "2026-11-16")).toEqual({
      opens: "10:00",
      closes: "18:00",
    });
  });

  it("should give nothing on a closed day", () => {
    expect(windowOn(hours(), "2026-11-14")).toBeNull();
  });
});

// Οι πιασμένες ώρες σε λεπτά της μέρας (10:00 = 600).
describe("firstFreeTime", () => {
  const window = { opens: "10:00", closes: "18:00" };

  it("should keep the opening hour when nobody is busy", () => {
    expect(firstFreeTime({ window, hours: 2, stepMinutes: 30, busy: [] })).toBe(
      "10:00",
    );
  });

  it("should move past a filming that holds the crew", () => {
    expect(
      firstFreeTime({
        window,
        hours: 2,
        stepMinutes: 30,
        busy: [{ from: 600, to: 720 }],
      }),
    ).toBe("12:00");
  });

  it("should give nothing when no slot fits inside the hours", () => {
    expect(
      firstFreeTime({
        window,
        hours: 4,
        stepMinutes: 30,
        busy: [{ from: 660, to: 900 }],
      }),
    ).toBeNull();
  });
});

describe("startSlotOf on an open Saturday", () => {
  it("should propose tomorrow's first open day, not today", () => {
    const saturdayOpen = hours({
      week: [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
        ...weekday(dow),
        isOpen: dow <= 6,
        opens: dow <= 6 ? "10:00" : null,
        closes: dow <= 6 ? "18:00" : null,
      })),
    });
    expect(
      startSlotOf(saturdayOpen, { date: "2026-11-14", time: "08:00" }),
    ).toEqual({ date: "2026-11-16", time: "10:00" });
  });
});
