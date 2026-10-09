import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { equipmentCaps } from "./caps";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: "33333333-3333-4333-8333-333333333333",
  email: "production@example.com",
  team: { name: "Ρένα", isOwner: false, permissions },
});

describe("equipmentCaps", () => {
  it("should give no rights to a visitor without a team membership", () => {
    expect(equipmentCaps({ status: "anonymous" })).toEqual({
      canView: false,
      canManage: false,
      canEditTemplates: false,
    });
  });

  it("should let a production user view and edit templates, but not manage", () => {
    expect(
      equipmentCaps(
        viewerWith({ "equipment.view": "all", "equipment.reserve": "mine" }),
      ),
    ).toEqual({ canView: true, canManage: false, canEditTemplates: true });
  });

  it("should let a manager view, manage and edit templates", () => {
    expect(
      equipmentCaps(
        viewerWith({ "equipment.view": "all", "equipment.manage": "all" }),
      ),
    ).toEqual({ canView: true, canManage: true, canEditTemplates: true });
  });

  it("should not let a view-only user edit templates", () => {
    expect(equipmentCaps(viewerWith({ "equipment.view": "all" }))).toEqual({
      canView: true,
      canManage: false,
      canEditTemplates: false,
    });
  });
});

