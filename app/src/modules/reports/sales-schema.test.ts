import { describe, expect, it } from "vitest";

import {
  parseSalesPipeline,
  parseSalesResults,
  parseSalesSources,
} from "./sales-schema";

const period = {
  code: "this-year",
  label: "Φέτος",
  from: "2026-01-01",
  to: "2026-12-31",
  through: "2026-06-30",
  isPartial: true,
};

const scoped = { isScoped: true, showSeller: false, seller: null, sellers: [] };

describe("parseSalesPipeline", () => {
  it("should read open opportunities without amounts and without a proposal", () => {
    const data = parseSalesPipeline({
      ...scoped,
      amounts: false,
      stages: [
        {
          stageId: "s1",
          label: "Νέα",
          count: 1,
          monthly: null,
          oneOff: null,
          withoutProposal: 1,
        },
      ],
      rows: [
        {
          opportunityId: "o1",
          title: "Βίντεο",
          clientName: "Πελάτης Α",
          stageId: "s1",
          stageLabel: "Νέα",
          managerName: null,
          kind: null,
          value: null,
          nextStepDue: "2026-07-01",
        },
      ],
      totals: { count: 1, monthly: null, oneOff: null, withoutProposal: 1 },
    });
    expect(data.rows[0]?.kind).toBeNull();
    expect(data.totals.withoutProposal).toBe(1);
  });

  it("should reject an unknown agreement kind", () => {
    expect(() =>
      parseSalesPipeline({
        ...scoped,
        amounts: true,
        stages: [],
        rows: [{ kind: "yearly" }],
        totals: { count: 0, monthly: 0, oneOff: 0, withoutProposal: 0 },
      }),
    ).toThrow();
  });
});

describe("parseSalesResults", () => {
  it("should read the win rate and the loss reasons", () => {
    const data = parseSalesResults({
      isScoped: false,
      showSeller: true,
      seller: { id: "u1", name: "Άννα" },
      sellers: [{ id: "u1", name: "Άννα" }],
      period,
      amounts: true,
      totals: {
        won: 1,
        lost: 2,
        winRate: 0.3333,
        wonMonthly: 800,
        wonOneOff: 0,
      },
      lossReasons: [{ reasonId: "r1", label: "Τιμή", count: 2 }],
      rows: [
        {
          opportunityId: "o1",
          title: "Μηνιαίο",
          clientName: "Πελάτης Α",
          managerName: "Άννα",
          outcome: "won",
          closedOn: "2026-05-20",
          lossReason: null,
          kind: "monthly",
          value: 800,
        },
      ],
    });
    expect(data.totals.winRate).toBe(0.3333);
    expect(data.seller?.name).toBe("Άννα");
  });
});

describe("parseSalesSources", () => {
  it("should read sources with no outcome yet (no win rate)", () => {
    const data = parseSalesSources({
      ...scoped,
      period,
      rows: [
        {
          sourceId: "s1",
          label: "Ιστοσελίδα",
          opened: 1,
          open: 1,
          won: 0,
          lost: 0,
          winRate: null,
        },
      ],
      totals: { opened: 1, open: 1, won: 0, lost: 0, winRate: null },
      opportunities: [
        {
          opportunityId: "o1",
          title: "Φόρμα",
          clientName: "Πελάτης Γ",
          sourceLabel: "Ιστοσελίδα",
          managerName: null,
          outcome: "open",
          createdOn: "2026-06-01",
        },
      ],
    });
    expect(data.rows[0]?.winRate).toBeNull();
  });
});
