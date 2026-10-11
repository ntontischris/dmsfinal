import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

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
    });
  });

  it("should open the queue to a producer who works on deliverables", () => {
    expect(deliverablesCaps(viewerWith({ "deliverables.work": "mine" }))).toEqual({
      canWork: true,
      canReview: false,
      canQueue: true,
      canSeeCharges: false,
    });
  });

  it("should let a reviewer with cost rights see the pending charges", () => {
    expect(
      deliverablesCaps(viewerWith({ "deliverables.review": "all", "finance.cost": "all" })),
    ).toEqual({ canWork: false, canReview: true, canQueue: true, canSeeCharges: true });
  });
});
