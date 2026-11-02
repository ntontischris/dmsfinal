import { describe, expect, it } from "vitest";

import type {
  PeriodBalance,
  ProductionCard,
  ProductionFilming,
} from "../types";
import { clientGroupsOf, clientStateLabel } from "./g1-client-model";
import {
  clientBlockers,
  clientProductionStats,
  clientProvisionRowsOf,
  clientProvisionSub,
} from "./g2-client-model";

const progressOf = (approved: number, total: number) => ({
  total,
  approved,
  waitingClient: 0,
  inWork: total - approved,
});

const filmingOf = (state: string): ProductionFilming => ({
  id: `f-${state}`,
  startsAt: "2026-11-10T08:00:00Z",
  hours: 2,
  state,
  isExtra: false,
  kind: null,
});

const cardOf = (overrides: Partial<ProductionCard> = {}): ProductionCard => ({
  id: "p1",
  title: "Social Νοεμβρίου",
  client: { id: "c1", name: "Κυψέλη" },
  period: null,
  owner: { id: null, name: "Μαρία" },
  state: "open",
  isInternal: false,
  ...overrides,
});

const periodOf = (starts: string) => ({
  n: 1,
  starts,
  ends: starts,
  state: "current" as const,
});

describe("clientProductionStats", () => {
  it("should show deliverables and filmings without open tasks", () => {
    const stats = clientProductionStats(progressOf(1, 3), [filmingOf("done")]);
    expect(stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Παραδοτέα", "1/3"],
      ["Γυρίσματα", "1"],
    ]);
  });
});

describe("clientBlockers", () => {
  it("should say that there is no deliverable yet", () => {
    expect(clientBlockers(progressOf(0, 0), [])).toEqual([
      "δεν υπάρχει ακόμα Παραδοτέο",
    ]);
  });

  it("should count unapproved deliverables and open filmings", () => {
    expect(
      clientBlockers(progressOf(1, 3), [
        filmingOf("scheduled"),
        filmingOf("done"),
      ]),
    ).toEqual(["2 Παραδοτέα δεν έχουν εγκριθεί", "1 ανοιχτά Γυρίσματα"]);
  });
});

describe("clientProvisionRowsOf", () => {
  it("should count reserved as used, like the classic client view", () => {
    const balance: PeriodBalance = {
      kindId: "k1",
      code: null,
      label: "Reels",
      unit: "τεμ.",
      given: 4,
      carried: 1,
      used: 1,
      reserved: 1,
      balance: 3,
    };
    const [row] = clientProvisionRowsOf([balance]);
    expect(clientProvisionSub(row)).toBe(
      "σύνολο 5 · χρησιμοποιήθηκαν 2 · απομένουν 3",
    );
  });
});

describe("clientStateLabel", () => {
  it("should use the client words for each state", () => {
    expect(clientStateLabel(cardOf())).toBe("σε εξέλιξη");
    expect(clientStateLabel(cardOf({ state: "delivered" }))).toBe("παραδόθηκε");
    expect(clientStateLabel(cardOf({ state: "cancelled" }))).toBe("ακυρώθηκε");
  });
});

describe("clientGroupsOf", () => {
  it("should group by period with the newest first and one-offs last", () => {
    const groups = clientGroupsOf([
      cardOf({ id: "once" }),
      cardOf({ id: "oct", period: periodOf("2026-10-01") }),
      cardOf({ id: "nov", period: periodOf("2026-11-01") }),
    ]);
    expect(groups.map((group) => group.cards.map((card) => card.id))).toEqual([
      ["nov"],
      ["oct"],
      ["once"],
    ]);
    expect(groups.at(-1)?.label).toBe("Εφάπαξ");
  });
});
