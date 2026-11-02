import { describe, expect, it } from "vitest";

import type { ClientDeliverableCard } from "../client-types";
import {
  clientProgressByProduction,
  clientRowSubOf,
  visibleForClient,
} from "./g2-client-model";

const cardOf = (
  overrides: Partial<ClientDeliverableCard> = {},
): ClientDeliverableCard => ({
  id: "d1",
  productionId: "p1",
  title: "Reel Οκτωβρίου",
  kind: "Reel",
  state: "in_progress",
  roundsUsed: 1,
  roundsLimit: 2,
  waitingSince: null,
  ...overrides,
});

describe("visibleForClient", () => {
  it("should leave out the cancelled deliverables", () => {
    const cards = [cardOf(), cardOf({ id: "d2", state: "cancelled" })];
    expect(visibleForClient(cards).map((card) => card.id)).toEqual(["d1"]);
  });
});

describe("clientRowSubOf", () => {
  it("should show the kind and the rounds out of the limit", () => {
    expect(clientRowSubOf(cardOf())).toBe("Reel · γύροι 1/2");
  });

  it("should show only the used rounds when there is no limit", () => {
    expect(clientRowSubOf(cardOf({ roundsLimit: null }))).toBe(
      "Reel · γύροι 1",
    );
  });
});

describe("clientProgressByProduction", () => {
  it("should count approved, waiting and in-work deliverables per production", () => {
    const progress = clientProgressByProduction([
      cardOf({ id: "a", state: "approved" }),
      cardOf({ id: "b", state: "awaiting_you" }),
      cardOf({ id: "c", state: "changes_requested" }),
      cardOf({ id: "d", state: "cancelled" }),
      cardOf({ id: "e", productionId: "p2" }),
    ]);
    expect(progress.get("p1")).toEqual({
      total: 3,
      approved: 1,
      waitingClient: 1,
      inWork: 1,
    });
    expect(progress.get("p2")?.inWork).toBe(1);
  });

  it("should have no entry for a production without deliverables", () => {
    expect(clientProgressByProduction([]).get("p1")).toBeUndefined();
  });
});
