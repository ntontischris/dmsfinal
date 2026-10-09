import { describe, expect, it } from "vitest";

import { STATUS_LABELS } from "./labels";
import {
  comparePickerItems,
  filterItems,
  groupEquipmentUnits,
  groupLabel,
  historyLines,
  isEquipmentStatus,
  selectableCategories,
  statusTone,
} from "./helpers";
import type {
  EquipmentCategory,
  EquipmentItemRow,
  HistoryEntry,
} from "./types";

const item = (overrides: Partial<EquipmentItemRow>): EquipmentItemRow => ({
  id: "44444444-4444-4444-8444-444444444444",
  name: "Gimbal",
  code: null,
  note: null,
  status: "available",
  statusNote: null,
  categoryId: "55555555-5555-4555-8555-555555555555",
  categoryName: "Στήριξη και σταθεροποίηση",
  categoryRetired: false,
  updatedAt: "2026-10-09T10:00:00Z",
  ...overrides,
});

const category = (
  overrides: Partial<EquipmentCategory>,
): EquipmentCategory => ({
  id: "66666666-6666-4666-8666-666666666666",
  name: "Drone",
  sortOrder: 6,
  isRetired: false,
  itemCount: 0,
  updatedAt: "2026-10-09T10:00:00Z",
  ...overrides,
});

const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  at: "2026-10-09T10:00:00Z",
  action: "update",
  event: null,
  actorName: "Γιώργος Ιδιοκτήτης",
  before: null,
  after: null,
  ...overrides,
});

describe("statusTone and labels", () => {
  it("should label every status in Greek", () => {
    expect(STATUS_LABELS).toEqual({
      available: "διαθέσιμο",
      in_repair: "σε επισκευή",
      retired: "αποσυρμένο",
    });
  });

  it("should mark a repair as attention and an available item as ok", () => {
    expect(statusTone("in_repair")).toBe("attention");
    expect(statusTone("available")).toBe("ok");
    expect(statusTone("retired")).toBeUndefined();
  });

  it("should recognise only the three database statuses", () => {
    expect(isEquipmentStatus("in_repair")).toBe(true);
    expect(isEquipmentStatus("lost")).toBe(false);
  });
});

describe("filterItems", () => {
  const items = [
    item({ id: "a", name: "Gimbal", status: "available" }),
    item({ id: "b", name: "Φακός 50mm", code: "SN-42", status: "retired" }),
    item({
      id: "c",
      name: "Drone Mavic",
      categoryId: "x",
      status: "in_repair",
    }),
  ];

  it("should hide retired items when no status is picked", () => {
    const visible = filterItems(items, {
      query: "",
      categoryId: "all",
      status: "all",
    });
    expect(visible.map((row) => row.id)).toEqual(["a", "c"]);
  });

  it("should show retired items when the retired status is picked", () => {
    const visible = filterItems(items, {
      query: "",
      categoryId: "all",
      status: "retired",
    });
    expect(visible.map((row) => row.id)).toEqual(["b"]);
  });

  it("should search by name or code, ignoring case", () => {
    const visible = filterItems(items, {
      query: "sn-42",
      categoryId: "all",
      status: "retired",
    });
    expect(visible.map((row) => row.id)).toEqual(["b"]);
  });
});

describe("selectableCategories", () => {
  it("should offer only active categories, plus the current one when retired", () => {
    const categories = [
      category({ id: "a" }),
      category({ id: "b", isRetired: true }),
      category({ id: "c", isRetired: true }),
    ];
    expect(selectableCategories(categories, "c").map((row) => row.id)).toEqual([
      "a",
      "c",
    ]);
    expect(selectableCategories(categories).map((row) => row.id)).toEqual([
      "a",
    ]);
  });
});

describe("historyLines", () => {
  it("should describe a status change with its reason", () => {
    const lines = historyLines([
      entry({
        action: "event",
        event: "status_changed",
        after: {
          event: "status_changed",
          from: "available",
          to: "in_repair",
          note: "Σπασμένο καλώδιο",
        },
      }),
    ]);
    expect(lines).toEqual([
      {
        at: "2026-10-09T10:00:00Z",
        actor: "Γιώργος Ιδιοκτήτης",
        text: "Κατάσταση: διαθέσιμο → σε επισκευή. Λόγος: Σπασμένο καλώδιο",
      },
    ]);
  });

  it("should hide an update that only changed the status, since its event already says it", () => {
    const lines = historyLines([
      entry({
        before: {
          name: "Gimbal",
          code: null,
          note: null,
          category_id: "c",
          status: "available",
        },
        after: {
          name: "Gimbal",
          code: null,
          note: null,
          category_id: "c",
          status: "in_repair",
        },
      }),
    ]);
    expect(lines).toEqual([]);
  });

  it("should report an update that changed the details", () => {
    const lines = historyLines([
      entry({
        before: { name: "Gimbal", code: null, note: null, category_id: "c" },
        after: { name: "Gimbal 2", code: null, note: null, category_id: "c" },
      }),
    ]);
    expect(lines.map((line) => line.text)).toEqual(["Άλλαξαν τα στοιχεία."]);
  });

  it("should report the creation of the item", () => {
    const lines = historyLines([
      entry({ action: "insert", after: { name: "Gimbal" } }),
    ]);
    expect(lines.map((line) => line.text)).toEqual(["Προστέθηκε στο μητρώο."]);
  });
});

const CAMERA_CATEGORY = "66666666-6666-4666-8666-666666666666";
const SOUND_CATEGORY = "77777777-7777-4777-8777-777777777777";

describe("groupEquipmentUnits", () => {
  it("should group units that share a category and base name into one row", () => {
    const rows = groupEquipmentUnits([
      item({ id: "u1", name: "Sony FX3 #1", status: "available" }),
      item({ id: "u2", name: "Sony FX3 #2", status: "in_repair", statusNote: "Οθόνη" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "group", group: { baseName: "Sony FX3" } });
  });

  it("should keep a lone unit as a single item row with its full name", () => {
    const rows = groupEquipmentUnits([item({ id: "u1", name: "Sony FX3 #1" })]);
    expect(rows).toEqual([{ kind: "item", item: expect.objectContaining({ name: "Sony FX3 #1" }) }]);
  });

  it("should not group units of different categories even with the same base name", () => {
    const rows = groupEquipmentUnits([
      item({ id: "u1", name: "Mic #1", categoryId: CAMERA_CATEGORY }),
      item({ id: "u2", name: "Mic #2", categoryId: SOUND_CATEGORY }),
    ]);
    expect(rows.map((row) => row.kind)).toEqual(["item", "item"]);
  });

  it("should count units per status in the group", () => {
    const [row] = groupEquipmentUnits([
      item({ id: "u1", name: "Sony FX3 #1", status: "available" }),
      item({ id: "u2", name: "Sony FX3 #2", status: "available" }),
      item({ id: "u3", name: "Sony FX3 #3", status: "in_repair", statusNote: "Οθόνη" }),
      item({ id: "u4", name: "Sony FX3 #4", status: "retired" }),
    ]);
    expect(row?.kind === "group" && row.group.counts).toEqual({
      available: 2,
      in_repair: 1,
      retired: 1,
    });
  });

  it("should order units by unit number inside the group", () => {
    const [row] = groupEquipmentUnits([
      item({ id: "u10", name: "Sony FX3 #10" }),
      item({ id: "u2", name: "Sony FX3 #2" }),
      item({ id: "u1", name: "Sony FX3 #1" }),
    ]);
    expect(row?.kind === "group" && row.group.units.map((unit) => unit.name)).toEqual([
      "Sony FX3 #1",
      "Sony FX3 #2",
      "Sony FX3 #10",
    ]);
  });

  it("should treat a # inside the name that is not a suffix as part of the name", () => {
    const rows = groupEquipmentUnits([
      item({ id: "u1", name: "Κιτ #1 Φωτός" }),
      item({ id: "u2", name: "Κιτ #1 Φωτός" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "group", group: { baseName: "Κιτ #1 Φωτός" } });
  });
});

describe("groupLabel", () => {
  it("should show the count, available and in-repair units", () => {
    const [row] = groupEquipmentUnits([
      item({ name: "Sony FX3 #1", status: "available" }),
      item({ name: "Sony FX3 #2", status: "available" }),
      item({ name: "Sony FX3 #3", status: "in_repair", statusNote: "Οθόνη" }),
    ]);
    expect(row?.kind === "group" && groupLabel(row.group)).toBe(
      "Sony FX3 ×3 · 2 διαθέσιμα · 1 σε επισκευή",
    );
  });

  it("should add the retired count only when some unit is retired", () => {
    const [row] = groupEquipmentUnits([
      item({ name: "Sony FX3 #1", status: "available" }),
      item({ name: "Sony FX3 #2", status: "retired" }),
    ]);
    expect(row?.kind === "group" && groupLabel(row.group)).toBe(
      "Sony FX3 ×2 · 1 διαθέσιμα · 0 σε επισκευή · 1 αποσυρμένα",
    );
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
