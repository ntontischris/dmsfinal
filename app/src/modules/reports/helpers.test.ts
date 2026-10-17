import { describe, expect, it } from "vitest";

import { barPercent, hasMovement, maxAmount } from "./helpers";
import type { TurnoverMonth } from "./view-schema";

const month = (overrides: Partial<TurnoverMonth>): TurnoverMonth => ({
  month: "2026-01",
  turnover: 0,
  invoiceCount: 0,
  creditCount: 0,
  collections: 0,
  receiptCount: 0,
  isPartial: false,
  ...overrides,
});

describe("hasMovement", () => {
  it("should be empty when no month has invoices, credits or receipts", () => {
    expect(hasMovement([month({}), month({ month: "2026-02" })])).toBe(false);
  });

  it("should count movement even when amounts are hidden", () => {
    expect(
      hasMovement([
        month({ turnover: null, collections: null, receiptCount: 1 }),
      ]),
    ).toBe(true);
  });
});

describe("barPercent", () => {
  it("should size a bar against the largest amount", () => {
    expect(barPercent(500, 1000)).toBe(50);
    expect(barPercent(1000, 1000)).toBe(100);
  });

  it("should use the absolute value of a negative turnover", () => {
    expect(barPercent(-250, 1000)).toBe(25);
  });

  it("should draw nothing when there are no amounts", () => {
    expect(barPercent(0, 0)).toBe(0);
  });
});

describe("maxAmount", () => {
  it("should take the largest turnover or collection, ignoring hidden amounts", () => {
    expect(
      maxAmount([
        month({ turnover: -800, collections: 300 }),
        month({ turnover: null, collections: 600 }),
      ]),
    ).toBe(800);
  });
});
