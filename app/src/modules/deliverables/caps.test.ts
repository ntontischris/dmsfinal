import { describe, expect, it } from "vitest";

import { isClientViewer, type Viewer } from "@/modules/access";

import { deliverablesCaps } from "./caps";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: "44444444-4444-4444-8444-444444444444",
  email: "team@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

describe("deliverablesCaps", () => {
  it("should give no queue to a visitor without a team membership", () => {
    expect(deliverablesCaps({ status: "anonymous" })).toEqual({
      canWork: false,
      canReview: false,
      canQueue: false,
      canSeeCharges: false,
      canSeeAmounts: false,
    });
  });

  it("should open the queue to a producer who works on deliverables", () => {
    expect(deliverablesCaps(viewerWith({ "deliverables.work": "mine" }))).toEqual({
      canWork: true,
      canReview: false,
      canQueue: true,
      canSeeCharges: false,
      canSeeAmounts: false,
    });
  });

  it("should let a reviewer who sees all amounts see the pending charges", () => {
    expect(
      deliverablesCaps(viewerWith({ "deliverables.review": "all", "finance.amounts": "all" })),
    ).toEqual({
      canWork: false,
      canReview: true,
      canQueue: true,
      canSeeCharges: true,
      canSeeAmounts: true,
    });
  });

  it("should hide the pending charges from someone who sees only their own amounts", () => {
    expect(deliverablesCaps(viewerWith({ "finance.amounts": "mine" })).canSeeCharges).toBe(false);
  });

  it("should show the client view to a client user only", () => {
    const client: Viewer = {
      status: "signed-in",
      userId: "55555555-5555-4555-8555-555555555555",
      email: "client@example.com",
      team: null,
      clientGrants: { "c.productions": "all", "c.approve": "all" },
    };
    expect(isClientViewer(client)).toBe(true);
    expect(isClientViewer(viewerWith({ "deliverables.work": "mine" }))).toBe(false);
  });
});
