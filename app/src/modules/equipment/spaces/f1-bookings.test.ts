import { describe, expect, it } from "vitest";

import type { EquipmentBooking, EquipmentItemRow } from "../types";
import { bookingIndexOf, daysOf } from "./f1-bookings";
import { isFreeOn } from "./f-model";

const booking = (
  overrides: Partial<EquipmentBooking> = {},
): EquipmentBooking => ({
  itemId: "cam-1",
  filmingId: "f-1",
  startsAt: "2026-11-06T07:00:00Z", // Παρασκευή 09:00 Αθήνας
  hours: 4,
  state: "scheduled",
  ...overrides,
});

const item = (overrides: Partial<EquipmentItemRow> = {}): EquipmentItemRow => ({
  id: "cam-1",
  name: "Κάμερα",
  code: null,
  note: null,
  status: "available",
  statusNote: null,
  categoryId: "c-1",
  categoryName: "Κάμερες",
  categoryRetired: false,
  updatedAt: "2026-11-01T10:00:00Z",
  ...overrides,
});

describe("daysOf", () => {
  it("gives the Athens day of a filming that ends the same day", () => {
    expect(daysOf("2026-11-06T07:00:00Z", 4)).toEqual(["2026-11-06"]);
  });

  it("adds the next day when the filming runs past midnight in Athens", () => {
    // 22:00 Αθήνας + 4 ώρες = 02:00 της επόμενης
    expect(daysOf("2026-11-06T20:00:00Z", 4)).toEqual([
      "2026-11-06",
      "2026-11-07",
    ]);
  });

  it("uses the Athens day, not the UTC day", () => {
    // 00:30 Αθήνας στις 7/11 είναι ακόμα 6/11 σε UTC
    expect(daysOf("2026-11-06T22:30:00Z", 1)).toEqual(["2026-11-07"]);
  });

  it("does not count a filming that ends exactly at midnight as the next day", () => {
    expect(daysOf("2026-11-06T20:00:00Z", 2)).toEqual(["2026-11-06"]);
  });
});

describe("bookingIndexOf", () => {
  it("keeps the first booking of each item as its next one, with a link only when given", () => {
    const index = bookingIndexOf([
      booking({ filmingId: null, state: "pending" }),
      booking({ startsAt: "2026-11-09T07:00:00Z", filmingId: "f-2" }),
      booking({ itemId: "lens-1", filmingId: "f-3" }),
    ]);
    expect(index.next["cam-1"]).toMatchObject({ href: null, isPending: true });
    expect(index.next["cam-1"]?.label).toContain("06/11");
    expect(index.next["lens-1"]?.href).toContain("f-3");
    expect(index.busyDays["cam-1"]).toEqual(["2026-11-06", "2026-11-09"]);
  });

  it("is empty when nothing is booked", () => {
    expect(bookingIndexOf([])).toEqual({ next: {}, busyDays: {} });
  });
});

describe("isFreeOn", () => {
  const busy = { "cam-1": ["2026-11-06"] };

  it("is free on a day without a booking", () => {
    expect(isFreeOn(item(), busy, "2026-11-07")).toBe(true);
  });

  it("is not free on a booked day", () => {
    expect(isFreeOn(item(), busy, "2026-11-06")).toBe(false);
  });

  it("is never free while in repair or retired", () => {
    expect(
      isFreeOn(
        item({ status: "in_repair", statusNote: "Οθόνη" }),
        {},
        "2026-11-07",
      ),
    ).toBe(false);
    expect(isFreeOn(item({ status: "retired" }), {}, "2026-11-07")).toBe(false);
  });
});
