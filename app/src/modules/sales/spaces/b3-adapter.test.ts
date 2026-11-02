import { describe, expect, it } from "vitest";

import type { Opportunity } from "../types";
import { boardCardsOf, daysAgoText } from "./b3-adapter";

const opportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "o-1",
  clientId: "c-1",
  clientName: "Κυψέλη Καφέ",
  clientManagerId: "me",
  title: "Μηνιαίο social",
  stageId: "s-1",
  sourceId: "src-1",
  referredBy: "",
  managerId: "me",
  managerName: "Άννα Δημητρίου",
  outcome: "open",
  lossReasonId: null,
  nextStep: "Κλήση",
  nextStepDue: "2026-10-30",
  followsId: null,
  followsTitle: null,
  closedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  ...overrides,
});

const input = (opportunities: Opportunity[]) => ({
  opportunities,
  sourceLabels: { "src-1": "Τηλέφωνο" },
  lossLabels: { "l-1": "Τιμή" },
  agreements: [{ opportunityId: "o-1", total: 900, kind: "monthly" as const }],
  lastContacts: { "c-1": "2026-10-28T09:00:00Z" },
  canWork: (o: Opportunity) => o.managerId === "me",
  today: "2026-11-02",
});

describe("boardCardsOf", () => {
  it("should build an open card with amount, forgotten step and last contact", () => {
    const [card] = boardCardsOf(input([opportunity()]));
    expect(card).toMatchObject({
      href: "/app/pipeline/o-1",
      source: "Τηλέφωνο",
      nextStep: "Κλήση (30/10/2026)",
      isForgotten: true,
      overdue: "πριν από 3 μέρες",
      lastContact: "2026-10-28T09:00:00Z",
      canWork: true,
    });
    expect(card?.amount).toMatch(/^900\s€ \/ μήνα$/);
  });

  it("should not let anyone work on closed or others' opportunities", () => {
    const [lost, others] = boardCardsOf(
      input([
        opportunity({ id: "o-2", outcome: "lost", lossReasonId: "l-1" }),
        opportunity({ id: "o-3", managerId: "other" }),
      ]),
    );
    expect(lost).toMatchObject({ canWork: false, lostReason: "Τιμή", nextStepDue: null, amount: null });
    expect(others?.canWork).toBe(false);
  });
});

describe("daysAgoText", () => {
  it("should say today, yesterday or days ago", () => {
    expect(daysAgoText("2026-11-02", "2026-11-02")).toBe("σήμερα");
    expect(daysAgoText("2026-11-01", "2026-11-02")).toBe("χθες");
    expect(daysAgoText("2026-10-20", "2026-11-02")).toBe("πριν από 13 μέρες");
  });
});
