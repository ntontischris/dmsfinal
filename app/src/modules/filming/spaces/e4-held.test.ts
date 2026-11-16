import { describe, expect, it } from "vitest";

import { heldProductionOf, type HeldProduction } from "./e4-held";

const CLIENT = { id: "c1", name: "Ελαιουργείο" };

const held = (over: Partial<HeldProduction> = {}): HeldProduction => ({
  id: "p1",
  title: "Ελαιουργείο — Νοέμβριος",
  state: "delivered",
  clientId: "c1",
  period: { starts: "2026-11-01", ends: "2026-11-30" },
  ...over,
});

const monthly = { kind: "monthly", client: CLIENT };

describe("heldProductionOf", () => {
  it("should find the delivered Production whose Period holds the day", () => {
    expect(heldProductionOf(monthly, "2026-11-25", [held()])?.id).toBe("p1");
  });

  it("should ignore another Client or a day outside the Period", () => {
    expect(
      heldProductionOf(monthly, "2026-11-25", [held({ clientId: "c2" })]),
    ).toBeUndefined();
    expect(heldProductionOf(monthly, "2026-12-02", [held()])).toBeUndefined();
  });

  it("should match a one-off Agreement to the Production without Period", () => {
    const oneOff = { kind: "one_off", client: CLIENT };
    expect(
      heldProductionOf(oneOff, "2026-11-25", [held({ period: null })])?.id,
    ).toBe("p1");
    expect(
      heldProductionOf(monthly, "2026-11-25", [held({ period: null })]),
    ).toBeUndefined();
  });

  it("should give nothing without an Agreement", () => {
    expect(heldProductionOf(undefined, "2026-11-25", [held()])).toBeUndefined();
  });
});
