import { describe, expect, it } from "vitest";

import type { TurnoverMonth } from "../view-schema";
import {
  agingCell,
  money,
  monthlyText,
  openSub,
  periodLabelWithDates,
  periodOptionLabel,
  quietText,
  shareWidth,
  turnoverChartOf,
} from "./m1-adapter";

const month = (overrides: Partial<TurnoverMonth> = {}): TurnoverMonth => ({
  month: "2026-01",
  turnover: 0,
  invoiceCount: 0,
  creditCount: 0,
  collections: 0,
  receiptCount: 0,
  isPartial: false,
  ...overrides,
});

describe("M1 adapter", () => {
  it("should show a dash when the database hides amounts", () => {
    expect(money(null)).toBe("—");
    expect(monthlyText(null)).toBe("—");
    expect(monthlyText(1200)).toMatch(/1\.200.*€ \/μήνα$/);
  });

  it("should write the period with its dates from the database", () => {
    expect(
      periodLabelWithDates({ label: "Αυτό το τρίμηνο", from: "2026-07-01", to: "2026-09-30" }),
    ).toBe("Αυτό το τρίμηνο (01/07–30/09/2026)");
  });

  it("should mark the period that is still running as «ως σήμερα» in the M1 filter", () => {
    const period = { label: "Αυτός ο μήνας", from: "2026-11-01", to: "2026-11-30" };
    expect(periodOptionLabel({ ...period, isPartial: true })).toBe(
      "Αυτός ο μήνας (01/11–30/11/2026) · ως σήμερα",
    );
    expect(periodOptionLabel({ ...period, isPartial: false })).toBe("Αυτός ο μήνας (01/11–30/11/2026)");
  });

  it("should leave quiet months out of the chart and scale bars to 60%", () => {
    const chart = turnoverChartOf([
      month({ month: "2026-01", turnover: 1000, collections: 500 }),
      month({ month: "2026-02" }),
      month({ month: "2026-03", turnover: -250, collections: 0, isPartial: true }),
    ]);
    expect(chart.quiet).toBe(1);
    expect(chart.bars.map((b) => b.month)).toEqual(["2026-01", "2026-03"]);
    expect(chart.bars[0]).toMatchObject({ turnoverWidth: "60%", collectionsWidth: "30%" });
    expect(chart.bars[1]).toMatchObject({ turnoverWidth: "15%", isPartial: true });
  });

  it("should say how many months the chart leaves out", () => {
    expect(quietText(1)).toMatch(/^1 μήνας χωρίς/);
    expect(quietText(3)).toMatch(/^3 μήνες χωρίς/);
  });

  it("should show invoice counts in the aging cells without amounts", () => {
    expect(agingCell(true, 120, 2)).toMatch(/120/);
    expect(agingCell(false, null, 2)).toBe("2 Τιμ.");
    expect(agingCell(true, 0, 0)).toBe("—");
  });

  it("should clamp the share bar between 0 and 100%", () => {
    expect(shareWidth(0.25)).toBe("25%");
    expect(shareWidth(1.4)).toBe("100%");
    expect(shareWidth(-0.1)).toBe("0%");
  });

  it("should name the owner only when the viewer sees several sellers", () => {
    expect(openSub("Πρόταση", "Άννα", true)).toBe("Πρόταση · Υπεύθυνος: Άννα");
    expect(openSub("Πρόταση", "Άννα", false)).toBe("Πρόταση");
    expect(openSub("Πρόταση", null, true)).toBe("Πρόταση");
  });
});
