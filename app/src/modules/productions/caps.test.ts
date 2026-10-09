import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { productionsCaps } from "./caps";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: "33333333-3333-4333-8333-333333333333",
  email: "producer@example.com",
  team: { name: "Νίκος", isOwner: false, permissions },
});

describe("productionsCaps", () => {
  it("should give no rights to a visitor without a team membership", () => {
    expect(productionsCaps({ status: "anonymous" })).toEqual({
      canView: false,
      canCreateInternal: false,
    });
  });

  it("should let a «mine» producer view but not create internal productions", () => {
    expect(productionsCaps(viewerWith({ "productions.manage": "mine" }))).toEqual({
      canView: true,
      canCreateInternal: false,
    });
  });

  it("should let an «all» producer view and create internal productions", () => {
    expect(productionsCaps(viewerWith({ "productions.manage": "all" }))).toEqual({
      canView: true,
      canCreateInternal: true,
    });
  });

  it("should not let a user without the permission see the screens", () => {
    expect(productionsCaps(viewerWith({ "equipment.view": "all" }))).toEqual({
      canView: false,
      canCreateInternal: false,
    });
  });
});
