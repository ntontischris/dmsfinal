import { describe, expect, it } from "vitest";

import type { EquipmentItemRow } from "../types";
import {
  conflictText,
  nameErrorOf,
  overlaps,
  pickerGroupsOf,
  replacementsFor,
  statusTone,
} from "./f-model";

const item = (overrides: Partial<EquipmentItemRow> = {}): EquipmentItemRow => ({
  id: "eq-cam-a",
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

describe("replacementsFor", () => {
  it("δίνει τα διαθέσιμα αντικείμενα της ίδιας Κατηγορίας, χωρίς το ίδιο", () => {
    const items = [
      item(),
      item({ id: "eq-cam-b", name: "Sony FX3 B", status: "in_repair" }),
      item({ id: "eq-cam-c", name: "Sony FX3 C", status: "retired" }),
      item({ id: "eq-mic", name: "Rode", categoryId: "cat-mic" }),
    ];
    expect(replacementsFor(items[1], items).map((other) => other.id)).toEqual(["eq-cam-a"]);
    expect(replacementsFor(item({ id: "nope", categoryId: "x" }), items)).toEqual([]);
  });
});

describe("statusTone και conflictText", () => {
  it("σημαδεύει μόνο ό,τι δεν είναι διαθέσιμο", () => {
    expect(statusTone("available")).toBeUndefined();
    expect(statusTone("in_repair")).toBe("attention");
    expect(statusTone("retired")).toBe("attention");
  });

  it("λέει αν ο Κανόνας μπλοκάρει ή προειδοποιεί", () => {
    expect(conflictText(true)).toContain("μπλοκάρουν");
    expect(conflictText(false)).toContain("μόνο προειδοποιούν");
  });
});

describe("nameErrorOf", () => {
  it("ζητά όνομα και δεν δέχεται ίδιο όνομα με άλλη γραφή", () => {
    expect(nameErrorOf("  ", [])).toBe("Γράψε όνομα.");
    expect(nameErrorOf("sony fx3 a ", [item()])).toContain("Υπάρχει ήδη");
    expect(nameErrorOf("Gimbal 2", [item()])).toBeNull();
  });
});

describe("overlaps", () => {
  const at = (start: string, end: string) => ({
    startsAt: `2026-11-05T${start}:00Z`,
    endsAt: `2026-11-05T${end}:00Z`,
  });

  it("επικαλύπτονται όταν το ένα αρχίζει πριν τελειώσει το άλλο", () => {
    expect(overlaps(at("09:00", "13:00"), at("12:00", "14:00"))).toBe(true);
  });

  it("δεν επικαλύπτονται όταν το ένα τελειώνει όταν αρχίζει το άλλο", () => {
    expect(overlaps(at("09:00", "12:00"), at("12:00", "14:00"))).toBe(false);
  });
});

describe("pickerGroupsOf", () => {
  it("ομαδοποιεί ανά Κατηγορία και κρύβει τα αποσυρμένα που δεν είναι ήδη μέσα", () => {
    const items = [
      item({ id: "mic", name: "Rode", categoryId: "cat-mic", categoryName: "Μικρόφωνα" }),
      item({ id: "cam-old", name: "Canon", status: "retired" }),
      item({ id: "cam-kept", name: "Blackmagic", status: "retired" }),
      item(),
    ];
    const groups = pickerGroupsOf(items, ["cam-kept"]);
    expect(groups.map((group) => group.categoryName)).toEqual(["Κάμερες", "Μικρόφωνα"]);
    expect(groups[0]?.items.map((one) => one.id)).toEqual(["cam-kept", "eq-cam-a"]);
  });
});
