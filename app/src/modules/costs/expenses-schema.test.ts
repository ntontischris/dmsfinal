import { describe, expect, it } from "vitest";

import {
  parseMonthExpenses,
  parseProfitRows,
  saveExpensesSchema,
} from "./expenses-schema";

describe("parseMonthExpenses", () => {
  it("δέχεται μήνα που δεν γράφτηκε, με προηγούμενο χωρίς ανάλυση", () => {
    const view = parseMonthExpenses({
      month: "2026-11-01",
      isClosed: false,
      canEdit: true,
      saved: null,
      previous: { month: "2026-10-01", productiveHours: 150, categories: null },
    });
    expect(view.saved).toBeNull();
    expect(view.previous?.categories).toBeNull();
  });
});

describe("parseProfitRows", () => {
  it("δέχεται εσωτερική Παραγωγή χωρίς Πελάτη και τιμή", () => {
    const [row] = parseProfitRows([
      {
        productionId: "p",
        title: "Showreel",
        clientId: null,
        client: null,
        month: "2026-03-01",
        isInternal: true,
        price: null,
        estimateCost: 0,
        actualCost: 50,
        hoursComplete: true,
        overrun: false,
      },
    ]);
    expect(row?.isInternal).toBe(true);
  });
});

describe("saveExpensesSchema", () => {
  it("θέλει μήνα YYYY-MM-01 και ώρες πάνω από 0", () => {
    expect(
      saveExpensesSchema.safeParse({
        month: "2026-11-01",
        categories: [],
        productiveHours: "220",
      }).success,
    ).toBe(true);
    expect(
      saveExpensesSchema.safeParse({
        month: "2026-11",
        categories: [],
        productiveHours: "220",
      }).success,
    ).toBe(false);
    expect(
      saveExpensesSchema.safeParse({
        month: "2026-11-01",
        categories: [],
        productiveHours: "0",
      }).success,
    ).toBe(false);
  });
});
