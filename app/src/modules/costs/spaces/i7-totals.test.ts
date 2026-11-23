import { describe, expect, it } from "vitest";

import type { ProfitRow } from "../expenses-schema";
import { allRows } from "./i7-model";
import { signOf, totalsOf } from "./i7-totals";

const row = (overrides: Partial<ProfitRow> = {}): ProfitRow => ({
  productionId: "p1",
  title: "Βίντεο Αθηνά",
  clientId: "c1",
  client: "Καφέ Αθηνά",
  month: "2026-03-01",
  isInternal: false,
  price: 1000,
  estimateCost: 200,
  actualCost: 250,
  hoursComplete: true,
  overrun: false,
  ...overrides,
});

describe("totalsOf", () => {
  it("should count only client Productions with price and real hours", () => {
    const totals = totalsOf(
      allRows([
        row(),
        row({ productionId: "p2", price: 500, actualCost: 600 }),
        row({ productionId: "p3", hoursComplete: false }),
        row({
          productionId: "p4",
          isInternal: true,
          clientId: null,
          client: null,
          price: null,
          actualCost: 80,
        }),
      ]),
    );
    expect(totals).toEqual({
      price: 1500,
      cost: 850,
      profit: 650,
      counted: 2,
      missing: 1,
      internalCost: 80,
    });
  });

  it("should give zeros when nothing counts", () => {
    expect(totalsOf([]).profit).toBe(0);
  });
});

describe("signOf", () => {
  it("should tell gain, loss and nothing yet apart", () => {
    expect(signOf(10)).toBe("gain");
    expect(signOf(-1)).toBe("loss");
    expect(signOf(0)).toBe("none");
    expect(signOf(null)).toBe("none");
  });
});
