import { describe, expect, it } from "vitest";

import type { CostMonth } from "@/modules/catalogue";

import { basisOf, decimalText, liveHourCost } from "./o6-live";

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

describe("basisOf", () => {
  const months = [costMonth("2026-10-01"), costMonth("2026-12-01", { expensesTotal: 9000 })];

  it("should prefer the chosen month when it has been saved", () => {
    expect(basisOf(months, "2026-12-01", "2026-10-01")?.expensesTotal).toBe(9000);
  });

  it("should fall back to the month in force", () => {
    expect(basisOf(months, "2026-11-01", "2026-10-01")?.month).toBe("2026-10-01");
  });

  it("should give nothing when no month has been saved", () => {
    expect(basisOf([], "2026-11-01", null)).toBeUndefined();
  });
});

describe("liveHourCost", () => {
  it("should divide expenses by hours with Greek decimals", () => {
    expect(liveHourCost("8000,5", "200")).toEqual({
      expenses: 8000.5,
      hours: 200,
      hourCost: 40.0025,
    });
  });

  it("should give nothing for zero hours or text that is not a number", () => {
    expect(liveHourCost("8000", "0")).toBeNull();
    expect(liveHourCost("abc", "200")).toBeNull();
  });
});

describe("decimalText", () => {
  it("should write the decimal with a comma", () => {
    expect(decimalText(1.5)).toBe("1,5");
    expect(decimalText(undefined)).toBe("");
  });
});
