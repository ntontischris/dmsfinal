import { describe, expect, it } from "vitest";

import { productionDetailSchema, productionsViewSchema } from "./view-schema";

const cardJson = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Οκτώβριος 2026 — Ταβέρνα",
  client: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Ταβέρνα Αρμύρα",
  },
  period: { n: 1, starts: "2026-10-01", ends: "2026-10-31", state: "current" },
  owner: { id: "33333333-3333-4333-8333-333333333333", name: "Νίκος" },
  state: "open",
  isInternal: false,
};

const detailJson = {
  ...cardJson,
  agreement: {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Μηνιαίο social",
    kind: "monthly",
  },
  balances: [
    {
      kind_id: "55555555-5555-4555-8555-555555555555",
      code: "reel",
      label: "Reel",
      unit: "ανά reel",
      given: 8,
      carried: 0,
      used: 0,
      reserved: 0,
      balance: 8,
    },
  ],
  deliveredAt: null,
  deliveredNote: null,
  cancelledAt: null,
  cancelledReason: null,
  members: [{ userId: "66666666-6666-4666-8666-666666666666", name: "Ρένα" }],
  history: [
    {
      at: "2026-10-09T10:00:00Z",
      action: "event",
      event: "created",
      actor_name: "Γιώργος",
      before: null,
      after: { event: "created" },
    },
  ],
  filmings: [],
  viewerCan: {
    deliver: true,
    reopen: false,
    cancel: true,
    transfer: true,
    members: true,
  },
};

describe("productionsViewSchema", () => {
  it("should read a card and keep the owner id only when the database sends it", () => {
    const [card] = productionsViewSchema.parse([cardJson]);
    expect(card?.owner).toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      name: "Νίκος",
    });
    expect(card?.period?.state).toBe("current");
  });

  it("should give a client card without an owner id", () => {
    const [card] = productionsViewSchema.parse([
      { ...cardJson, owner: { name: "Νίκος" } },
    ]);
    expect(card?.owner).toEqual({ id: null, name: "Νίκος" });
  });

  it("should reject an unknown production state", () => {
    expect(() =>
      productionsViewSchema.parse([{ ...cardJson, state: "κλειστή" }]),
    ).toThrow();
  });
});

describe("productionDetailSchema", () => {
  it("should camelize the balances and the history of the page", () => {
    const detail = productionDetailSchema.parse(detailJson);
    expect(detail.balances[0]).toMatchObject({
      kindId: "55555555-5555-4555-8555-555555555555",
      given: 8,
    });
    expect(detail.history[0]).toMatchObject({
      actorName: "Γιώργος",
      event: "created",
    });
    expect(detail.viewerCan.transfer).toBe(true);
  });

  it("should read a client page with no members and no actions", () => {
    const detail = productionDetailSchema.parse({
      ...detailJson,
      members: [],
      history: [],
      viewerCan: {
        deliver: false,
        reopen: false,
        cancel: false,
        transfer: false,
        members: false,
      },
    });
    expect(detail.members).toEqual([]);
    expect(detail.viewerCan.deliver).toBe(false);
  });
});
