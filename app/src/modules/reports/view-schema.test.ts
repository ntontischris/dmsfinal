import { describe, expect, it } from "vitest";

import {
  parsePeriods,
  parseReceivablesAging,
  parseTurnoverByClient,
  parseTurnoverMonthly,
} from "./view-schema";

const period = {
  code: "this-year",
  label: "Φέτος",
  from: "2026-01-01",
  to: "2026-12-31",
  through: "2026-06-30",
  isPartial: true,
};

describe("parsePeriods", () => {
  it("should read the periods with the «as of today» mark", () => {
    const data = parsePeriods({
      today: "2026-06-30",
      default: "this-year",
      items: [period],
    });
    expect(data.items[0]?.isPartial).toBe(true);
  });
});

describe("parseTurnoverMonthly", () => {
  it("should accept hidden amounts as null next to counts", () => {
    const data = parseTurnoverMonthly({
      period,
      amounts: false,
      client: null,
      clients: [{ id: "c1", name: "Πελάτης Α" }],
      months: [
        {
          month: "2026-06",
          turnover: null,
          invoiceCount: 1,
          creditCount: 1,
          collections: null,
          receiptCount: 1,
          isPartial: true,
        },
      ],
      totals: {
        turnover: null,
        invoiceCount: 1,
        creditCount: 1,
        collections: null,
        receiptCount: 1,
      },
    });
    expect(data.months[0]?.turnover).toBeNull();
    expect(data.totals.invoiceCount).toBe(1);
  });
});

describe("parseTurnoverByClient", () => {
  it("should read rows with their share", () => {
    const data = parseTurnoverByClient({
      period,
      amounts: true,
      rows: [
        {
          clientId: "c1",
          clientName: "Πελάτης Α",
          turnover: 1500,
          share: 0.8571,
          invoiceCount: 2,
          creditCount: 0,
        },
      ],
      totals: { turnover: 1750, invoiceCount: 4, creditCount: 1 },
    });
    expect(data.rows[0]?.share).toBe(0.8571);
  });
});

describe("parseReceivablesAging", () => {
  const row = {
    clientId: "c2",
    clientName: "Πελάτης Β",
    buckets: [0, 0, 62, 0, 148],
    counts: [0, 0, 1, 0, 1],
    total: 210,
    invoiceCount: 2,
    oldestDue: "2026-03-15",
  };
  const totals = {
    buckets: row.buckets,
    counts: row.counts,
    total: 210,
    overdue: 210,
    invoiceCount: 2,
  };

  it("should read five buckets per client", () => {
    const data = parseReceivablesAging({
      today: "2026-06-30",
      amounts: true,
      rows: [row],
      totals,
    });
    expect(data.rows[0]?.buckets[4]).toBe(148);
  });

  it("should reject a row without exactly five buckets", () => {
    expect(() =>
      parseReceivablesAging({
        today: "2026-06-30",
        amounts: true,
        rows: [{ ...row, buckets: [0, 0, 62, 0] }],
        totals,
      }),
    ).toThrow();
  });
});
