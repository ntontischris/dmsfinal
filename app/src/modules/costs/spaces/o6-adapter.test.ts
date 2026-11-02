import { describe, expect, it } from "vitest";

import { changeRowsOf, hourCostOf, methodItemsOf } from "./o6-adapter";

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
