import { describe, expect, it } from "vitest";

import { clientCardsOf, roundsText } from "./client-helpers";
import type { ClientDeliverableCard, ClientDeliverablesView } from "./client-types";

const card = (id: string, productionId: string, overrides: Partial<ClientDeliverableCard> = {}): ClientDeliverableCard => ({
  id,
  productionId,
  title: `Παραδοτέο ${id}`,
  kind: "Reel",
  state: "in_progress",
  roundsUsed: 0,
  roundsLimit: 2,
  waitingSince: null,
  ...overrides,
});

const view: ClientDeliverablesView = {
  periods: [
    {
      periodId: "p1",
      periodLabel: "Περίοδος 1",
      provisions: [],
      deliverables: [card("a", "prod-1"), card("b", "prod-2")],
    },
  ],
  awaitingYou: [card("a", "prod-1", { state: "awaiting_you", waitingSince: "2026-10-10" })],
};

describe("clientCardsOf", () => {
  it("should keep only the deliverables of the given production", () => {
    const cards = clientCardsOf(view, "prod-1");
    expect(cards.all.map((item) => item.id)).toEqual(["a"]);
    expect(cards.awaiting.map((item) => item.id)).toEqual(["a"]);
  });
});

describe("roundsText", () => {
  it("should show the used rounds out of the limit", () => {
    expect(roundsText(1, 2)).toBe("Γύροι αλλαγών: 1 από 2");
  });

  it("should show only the used rounds when there is no limit", () => {
    expect(roundsText(1, null)).toBe("Γύροι αλλαγών: 1");
  });
});
