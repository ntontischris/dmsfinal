import { describe, expect, it } from "vitest";

import type { CostMonth } from "@/modules/catalogue";

import {
  changeRowsOf,
  hourCostOf,
  methodItemsOf,
  monthRowsOf,
  multiplierRowsOf,
} from "./o6-adapter";

const hint = {
  hourCostMonth: "2026-11-01",
  hourCost: 42.5,
  multipliers: { min: 1.3, target: 1.6, max: 2 },
  overrunPercent: 20,
};

describe("changeRowsOf", () => {
  it("should name the changed fields in Greek", () => {
    const [row] = changeRowsOf([
      {
        at: "2026-11-02T08:30:00Z",
        entity: "cost_months",
        actorName: "Γιώργος",
        fields: ["expenses_total", "hour_cost", "unknown_field"],
      },
    ]);
    expect(row?.title).toBe("Γιώργος");
    expect(row?.sub).toBe("Έξοδα, Κόστος ώρας, unknown_field");
    expect(row?.when).toBe("02/11/2026, 10:30");
  });

  it("should say «άλλαξε» when no field is known", () => {
    const [row] = changeRowsOf([
      {
        at: "2026-11-02T08:30:00Z",
        entity: "cost_settings",
        actorName: "x",
        fields: [],
      },
    ]);
    expect(row?.sub).toBe("άλλαξε");
  });
});

describe("methodItemsOf", () => {
  it("should show retired methods as retired and the rest as in use", () => {
    expect(
      methodItemsOf([
        { id: "a", label: "Μετρητά", retired: false },
        { id: "b", label: "Επιταγή", retired: true },
      ]).map((item) => item.status),
    ).toEqual(["Σε χρήση", "Αποσύρθηκε"]);
  });
});

describe("hourCostOf", () => {
  it("should give the month and hour cost in force", () => {
    expect(hourCostOf(hint)).toEqual({
      monthLabel: expect.stringContaining("2026"),
      hourCost: 42.5,
    });
  });

  it("should be pending when no hour cost was ever set", () => {
    expect(
      hourCostOf({ ...hint, hourCost: null, hourCostMonth: null }),
    ).toEqual({
      monthLabel: null,
      hourCost: null,
    });
  });
});

const costMonth = (month: string, overrides: Partial<CostMonth> = {}): CostMonth => ({
  month,
  expensesTotal: 8000,
  productiveHours: 200,
  hourCost: 40,
  isClosed: false,
  updatedAt: "2026-11-02T08:30:00Z",
  updatedByName: "Γιώργος",
  ...overrides,
});

const fmt = {
  money: (value: number) => `${value}€`,
  hours: (value: number) => String(value),
};

describe("monthRowsOf", () => {
  it("should mark past, current and future months", () => {
    const rows = monthRowsOf(
      [costMonth("2026-10-01"), costMonth("2026-11-01"), costMonth("2026-12-01")],
      "2026-11-01",
      fmt,
    );
    expect(rows.map((row) => row.status)).toEqual(["closed", "current", "future"]);
  });

  it("should show hours, hour cost and who saved the month", () => {
    const [row] = monthRowsOf([costMonth("2026-11-01")], "2026-11-01", fmt);
    expect(row?.sub).toBe("200 ώρες · Κόστος ώρας 40€ · Γιώργος, 02/11/2026, 10:30");
  });

  it("should leave out the author when it is unknown", () => {
    const [row] = monthRowsOf(
      [costMonth("2026-11-01", { updatedByName: null })],
      "2026-11-01",
      fmt,
    );
    expect(row?.sub).toBe("200 ώρες · Κόστος ώρας 40€");
  });
});

describe("multiplierRowsOf", () => {
  it("should give the margin of each multiplier", () => {
    const rows = multiplierRowsOf({ min: 1.25, target: 2, max: 4 });
    expect(rows.map((row) => row.label)).toEqual(["Ελάχιστη", "Στόχος", "Μέγιστη"]);
    expect(rows[0]?.margin).toBeCloseTo(0.2);
    expect(rows[1]?.margin).toBeCloseTo(0.5);
    expect(rows[2]?.margin).toBeCloseTo(0.75);
  });
});
