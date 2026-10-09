import { describe, expect, it } from "vitest";

import { STATUS_LABELS } from "./labels";
import {
  filterItems,
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
