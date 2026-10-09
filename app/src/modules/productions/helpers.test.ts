import { describe, expect, it } from "vitest";

import {
  balanceRows,
  historyLines,
  memberChoices,
  ownerChoices,
  periodLabel,
  stateTone,
  tabState,
} from "./helpers";
import type {
  PeriodBalance,
  ProductionHistoryEntry,
  ProductionMember,
} from "./types";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";

const balance = (overrides: Partial<PeriodBalance>): PeriodBalance => ({
  kindId: "44444444-4444-4444-8444-444444444444",
  code: "reel",
  label: "Reel",
  unit: "ανά reel",
  given: 8,
  carried: 0,
  used: 0,
  reserved: 0,
  balance: 8,
  ...overrides,
});

const historyEntry = (
  overrides: Partial<ProductionHistoryEntry>,
): ProductionHistoryEntry => ({
  at: "2026-10-09T10:00:00Z",
  action: "event",
  event: "delivered",
  actorName: "Γιώργος",
  before: null,
  after: null,
  ...overrides,
});

const member = (userId: string): ProductionMember => ({
  userId,
  name: "Μέλος",
});

describe("periodLabel", () => {
  it("should name the calendar month and year of the period start", () => {
    expect(periodLabel("2026-10-05")).toBe("Οκτώβριος 2026");
  });

  it("should name January and December at the edges of the year", () => {
    expect(periodLabel("2027-01-01")).toBe("Ιανουάριος 2027");
    expect(periodLabel("2026-12-31")).toBe("Δεκέμβριος 2026");
  });
});

describe("balanceRows", () => {
  it("should keep every kind and mark a row empty only when nothing was given or carried", () => {
    const rows = balanceRows([
      balance({ kindId: "a" }),
      balance({
        kindId: "b",
        given: 0,
        carried: 0,
        used: 0,
        reserved: 0,
        balance: 0,
      }),
    ]);
    expect(rows.map((row) => [row.kindId, row.isEmpty])).toEqual([
      ["a", false],
      ["b", true],
    ]);
  });

  it("should count a carried-over provision as not empty", () => {
    const [row] = balanceRows([balance({ given: 0, carried: 2, balance: 2 })]);
    expect(row?.isEmpty).toBe(false);
  });
});

describe("tabState and stateTone", () => {
  it("should not filter by state for the all tab", () => {
    expect(tabState("all")).toBeNull();
    expect(tabState("open")).toBe("open");
    expect(tabState("delivered")).toBe("delivered");
  });

  it("should mark only delivered productions with the ok tone", () => {
    expect(stateTone("delivered")).toBe("ok");
    expect(stateTone("open")).toBeUndefined();
    expect(stateTone("cancelled")).toBeUndefined();
  });
});

describe("ownerChoices and memberChoices", () => {
  const candidates = [
    { id: OWNER_ID, name: "Γιώργος" },
    { id: MEMBER_ID, name: "Ρένα" },
    { id: OTHER_ID, name: "Νίκος" },
  ];

  it("should offer every candidate except the current owner", () => {
    expect(
      ownerChoices(candidates, OWNER_ID).map((choice) => choice.id),
    ).toEqual([MEMBER_ID, OTHER_ID]);
  });

  it("should offer members only for people who are neither owner nor member", () => {
    expect(
      memberChoices(candidates, OWNER_ID, [member(MEMBER_ID)]).map(
        (choice) => choice.id,
      ),
    ).toEqual([OTHER_ID]);
  });
});

describe("historyLines", () => {
  it("should show one line per event and skip the raw row changes", () => {
    const lines = historyLines([
      historyEntry({ action: "update", event: null }),
      historyEntry({
        event: "cancelled",
        after: { event: "cancelled", reason: "Δεν χρειάζεται" },
      }),
    ]);
    expect(lines).toEqual([
      {
        at: "2026-10-09T10:00:00Z",
        actor: "Γιώργος",
        text: "Ακυρώθηκε. Λόγος: Δεν χρειάζεται",
      },
    ]);
  });

  it("should show the delivery note after the label", () => {
    const [line] = historyLines([
      historyEntry({ event: "delivered", after: { event: "delivered", note: "Drive" } }),
    ]);
    expect(line?.text).toBe("Παραδόθηκε: Drive");
  });

  it("should show a dash for an unknown actor", () => {
    const [line] = historyLines([
      historyEntry({ actorName: null, event: "member_added" }),
    ]);
    expect(line).toEqual({
      at: "2026-10-09T10:00:00Z",
      actor: "—",
      text: "Προστέθηκε Μέλος",
    });
  });
});
