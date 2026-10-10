import { describe, expect, it } from "vitest";

import {
  bookingDaysSchema,
  bookingHoursViewSchema,
  bookingOptionsViewSchema,
  bookingSlotsSchema,
  slotCheckSchema,
} from "./view-schema-booking";

const weekRow = (dow: number, isOpen: boolean) => ({
  dow,
  isOpen,
  opens: isOpen ? "09:00" : null,
  closes: isOpen ? "19:00" : null,
});

const hoursView = {
  isSet: true,
  week: [1, 2, 3, 4, 5, 6, 7].map((dow) => weekRow(dow, dow < 7)),
  capacity: 2,
  durations: [2, 3, 4],
  stepMinutes: 60,
  exceptions: [
    { day: "2026-12-24", isClosed: true, opens: null, closes: null, capacity: null, note: "Παραμονή" },
  ],
  holidays: [{ day: "2026-03-25", name: "Εθνική εορτή", movable: false, isOpen: false, isOpened: false, isPast: false }],
};

describe("bookingHoursViewSchema", () => {
  it("should read the weekly hours, exceptions and holidays of the view", () => {
    expect(bookingHoursViewSchema.parse(hoursView).week).toHaveLength(7);
  });

  it("should reject a view without the week", () => {
    expect(() => bookingHoursViewSchema.parse({ ...hoursView, week: undefined })).toThrow();
  });
});

describe("bookingOptionsViewSchema", () => {
  it("should read the options with the agreements and their kinds", () => {
    const parsed = bookingOptionsViewSchema.parse({
      isSet: false,
      durations: [2],
      stepMinutes: 60,
      horizonDays: 60,
      agreements: [],
    });
    expect(parsed.isSet).toBe(false);
  });
});

describe("bookingDaysSchema", () => {
  it("should read each day with its status and Greek label", () => {
    const days = bookingDaysSchema.parse([
      { day: "2026-10-12", status: "free", label: "Ελεύθερη" },
    ]);
    expect(days[0]?.status).toBe("free");
  });

  it("should reject a status the database does not send", () => {
    expect(() =>
      bookingDaysSchema.parse([{ day: "2026-10-12", status: "maybe", label: "?" }]),
    ).toThrow();
  });
});

describe("bookingSlotsSchema", () => {
  it("should read the free slots as ISO instants", () => {
    expect(bookingSlotsSchema.parse(["2026-10-12T07:00:00+00:00"])).toEqual([
      "2026-10-12T07:00:00+00:00",
    ]);
  });
});

describe("slotCheckSchema", () => {
  it("should read a slot with its problem, load and capacity", () => {
    expect(
      slotCheckSchema.parse({ problem: "Η ώρα είναι γεμάτη (2/2)", load: 2, capacity: 2 }).problem,
    ).toBe("Η ώρα είναι γεμάτη (2/2)");
  });

  it("should read a free slot with no problem", () => {
    expect(slotCheckSchema.parse({ problem: null, load: 0, capacity: 2 }).problem).toBeNull();
  });
});
