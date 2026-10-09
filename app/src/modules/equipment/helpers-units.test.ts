import { describe, expect, it } from "vitest";

import {
  comparePickerItems,
  groupEquipmentUnits,
  groupLabel,
  matchesItemFilter,
  type ItemFilter,
} from "./helpers";
import type { EquipmentItemRow, EquipmentStatus, UnitGroup } from "./types";

const CAMERA_CATEGORY = "66666666-6666-4666-8666-666666666666";
const SOUND_CATEGORY = "77777777-7777-4777-8777-777777777777";
const ALL_FILTER: ItemFilter = { query: "", categoryId: "all", status: "all" };
const everything = (): boolean => true;

const item = (overrides: Partial<EquipmentItemRow>): EquipmentItemRow => ({
  id: "44444444-4444-4444-8444-444444444444",
  name: "Gimbal",
  code: null,
  note: null,
  status: "available",
  statusNote: null,
  categoryId: CAMERA_CATEGORY,
  categoryName: "Στήριξη και σταθεροποίηση",
  categoryRetired: false,
  updatedAt: "2026-10-09T10:00:00Z",
  ...overrides,
});

const statusOf = (status: EquipmentStatus, id: string): EquipmentItemRow =>
  item({ id, name: `Sony FX3 #${id}`, status, statusNote: status === "in_repair" ? "Οθόνη" : null });

const onlyGroup = (rows: ReturnType<typeof groupEquipmentUnits>): UnitGroup => {
  const [row] = rows;
  if (row?.kind !== "group") throw new Error("expected a group row");
  return row.group;
};

describe("groupEquipmentUnits", () => {
  it("should group units that share a category and base name into one row", () => {
    const rows = groupEquipmentUnits(
      [item({ id: "u1", name: "Sony FX3 #1" }), item({ id: "u2", name: "Sony FX3 #2" })],
      everything,
    );
    expect(rows).toHaveLength(1);
    expect(onlyGroup(rows).baseName).toBe("Sony FX3");
  });

  it("should keep a lone unit as a single item row with its full name", () => {
    const rows = groupEquipmentUnits([item({ id: "u1", name: "Sony FX3 #1" })], everything);
    expect(rows).toEqual([{ kind: "item", item: expect.objectContaining({ name: "Sony FX3 #1" }) }]);
  });

  it("should not group units of different categories even with the same base name", () => {
    const rows = groupEquipmentUnits(
      [
        item({ id: "u1", name: "Mic #1", categoryId: CAMERA_CATEGORY }),
        item({ id: "u2", name: "Mic #2", categoryId: SOUND_CATEGORY }),
      ],
      everything,
    );
    expect(rows.map((row) => row.kind)).toEqual(["item", "item"]);
  });

  it("should count units per status over all units of the group", () => {
    const group = onlyGroup(
      groupEquipmentUnits(
        [statusOf("available", "1"), statusOf("available", "2"), statusOf("in_repair", "3"), statusOf("retired", "4")],
        everything,
      ),
    );
    expect(group.counts).toEqual({ available: 2, in_repair: 1, retired: 1 });
  });

  it("should order units by unit number inside the group", () => {
    const group = onlyGroup(
      groupEquipmentUnits(
        [
          item({ id: "u10", name: "Sony FX3 #10" }),
          item({ id: "u2", name: "Sony FX3 #2" }),
          item({ id: "u1", name: "Sony FX3 #1" }),
        ],
        everything,
      ),
    );
    expect(group.units.map((unit) => unit.name)).toEqual(["Sony FX3 #1", "Sony FX3 #2", "Sony FX3 #10"]);
  });

  it("should treat a # inside the name that is not a suffix as part of the name", () => {
    const rows = groupEquipmentUnits(
      [item({ id: "u1", name: "Κιτ #1 Φωτός" }), item({ id: "u2", name: "Κιτ #1 Φωτός" })],
      everything,
    );
    expect(onlyGroup(rows).baseName).toBe("Κιτ #1 Φωτός");
  });

  it("should group names that differ only in letter case, as the database does", () => {
    const group = onlyGroup(
      groupEquipmentUnits([item({ id: "u1", name: "Sony FX3 #1" }), item({ id: "u2", name: "sony fx3 #2" })], everything),
    );
    expect(group.units).toHaveLength(2);
  });

  it("should group a suffix-less unit with its numbered siblings and put it last", () => {
    const group = onlyGroup(
      groupEquipmentUnits([item({ id: "plain", name: "Sony FX3" }), item({ id: "u1", name: "Sony FX3 #1" })], everything),
    );
    expect(group.units.map((unit) => unit.name)).toEqual(["Sony FX3 #1", "Sony FX3"]);
    expect(groupLabel(group)).toBe("Sony FX3 ×2 · 2 διαθέσιμα");
  });

  it("should keep the whole group and list only the units that match a status filter", () => {
    const rows = groupEquipmentUnits(
      [statusOf("available", "1"), statusOf("available", "2"), statusOf("in_repair", "3")],
      (unit) => unit.status === "in_repair",
    );
    const group = onlyGroup(rows);
    expect(group.shown.map((unit) => unit.id)).toEqual(["3"]);
    expect(group.units).toHaveLength(3);
    expect(groupLabel(group)).toBe("Sony FX3 ×3 · 2 διαθέσιμα · 1 σε επισκευή");
  });

  it("should keep a two-unit group as a group when the filter leaves one unit", () => {
    const rows = groupEquipmentUnits(
      [statusOf("available", "1"), statusOf("in_repair", "2")],
      (unit) => unit.status === "in_repair",
    );
    expect(rows.map((row) => row.kind)).toEqual(["group"]);
  });

  it("should drop a group when no unit matches the filter", () => {
    const rows = groupEquipmentUnits(
      [statusOf("available", "1"), statusOf("available", "2")],
      (unit) => unit.status === "in_repair",
    );
    expect(rows).toEqual([]);
  });

  it("should hide retired units by default but still count them in the group", () => {
    const group = onlyGroup(
      groupEquipmentUnits(
        [statusOf("available", "1"), statusOf("available", "2"), statusOf("retired", "3")],
        (unit) => matchesItemFilter(unit, ALL_FILTER),
      ),
    );
    expect(group.shown.map((unit) => unit.id)).toEqual(["1", "2"]);
    expect(groupLabel(group)).toBe("Sony FX3 ×3 · 2 διαθέσιμα · 1 αποσυρμένα");
  });
});

describe("groupLabel", () => {
  it("should omit the parts whose count is zero", () => {
    const group = onlyGroup(
      groupEquipmentUnits([statusOf("available", "1"), statusOf("available", "2")], everything),
    );
    expect(groupLabel(group)).toBe("Sony FX3 ×2 · 2 διαθέσιμα");
  });
});

describe("comparePickerItems", () => {
  it("should keep units of one group together, ordered by unit number", () => {
    const sorted = [
      item({ id: "u3", name: "Sony FX3 #3" }),
      item({ id: "x", name: "Rode", categoryName: "Ήχος" }),
      item({ id: "u1", name: "Sony FX3 #1" }),
      item({ id: "u2", name: "Sony FX3 #2" }),
    ].sort(comparePickerItems);
    expect(sorted.map((row) => row.id)).toEqual(["x", "u1", "u2", "u3"]);
  });
});
