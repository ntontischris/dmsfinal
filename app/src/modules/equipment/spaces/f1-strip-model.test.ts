import { describe, expect, it } from "vitest";

import type { EquipmentBooking, EquipmentItemRow } from "../types";
import { equipmentStripOf } from "./f1-strip-model";

const item = (overrides: Partial<EquipmentItemRow>): EquipmentItemRow => ({
  id: "eq-a",
  name: "Sony FX3 A",
  code: null,
  note: null,
  status: "available",
  statusNote: null,
  categoryId: "cat-cam",
  categoryName: "Κάμερες",
  categoryRetired: false,
  updatedAt: "2026-10-01T09:00:00Z",
  ...overrides,
});

const booking = (
  itemId: string,
  startsAt: string,
  hours = 4,
): EquipmentBooking => ({
  itemId,
  filmingId: null,
  startsAt,
  hours,
  state: "scheduled",
});

const WEEK = { today: "2026-11-16" };

describe("τα τρία χοντρά της καρτέλας Εξοπλισμός", () => {
  it("σύγκρουση = επικαλυπτόμενες Δεσμεύσεις ή Δέσμευση σε επισκευή· όχι οι διαδοχικές", () => {
    const strip = equipmentStripOf({
      items: [
        item({ id: "a" }),
        item({ id: "b", status: "in_repair" }),
        item({ id: "c" }),
        item({ id: "d", status: "in_repair" }),
      ],
      bookings: [
        booking("a", "2026-11-17T08:00:00Z"),
        booking("a", "2026-11-17T10:00:00Z"),
        booking("b", "2026-11-30T08:00:00Z"),
        booking("c", "2026-11-18T08:00:00Z"),
        booking("c", "2026-11-18T12:00:00Z"),
      ],
      ...WEEK,
    });
    expect(strip.map(({ label, value, tone }) => [label, value, tone])).toEqual(
      [
        ["Συγκρούσεις", "2", "attention"],
        ["Σε επισκευή", "2", "attention"],
        ["Βγαίνουν την εβδομάδα", "2", undefined],
      ],
    );
  });

  it("χωρίς Δεσμεύσεις και επισκευές όλα είναι 0 και ήσυχα", () => {
    const strip = equipmentStripOf({
      items: [item({})],
      bookings: [],
      ...WEEK,
    });
    expect(
      strip.every((stat) => stat.value === "0" && stat.tone === undefined),
    ).toBe(true);
  });
});
