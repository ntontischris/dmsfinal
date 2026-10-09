import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { filmingCaps } from "./caps";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: "33333333-3333-4333-8333-333333333333",
  email: "crew@example.com",
  team: { name: "Μαρία", isOwner: false, permissions },
});

const NO_RIGHTS = {
  canView: false,
  canApprove: false,
  canBook: false,
  canCrew: false,
  canReserve: false,
  canManageSettings: false,
  canBookInternal: false,
};

describe("filmingCaps", () => {
  it("should give no rights to a visitor without a team membership", () => {
    expect(filmingCaps({ status: "anonymous" })).toEqual(NO_RIGHTS);
  });

  it("should let a crew member with «mine» scope view and crew but not book or approve", () => {
    expect(
      filmingCaps(viewerWith({ "filming.view": "mine", "filming.crew": "mine" })),
    ).toEqual({ ...NO_RIGHTS, canView: true, canCrew: true });
  });

  it("should let an owner with full rights book internal filmings", () => {
    expect(
      filmingCaps(
        viewerWith({
          "filming.view": "all",
          "filming.book": "all",
          "filming.approve": "all",
          "filming.crew": "all",
          "equipment.reserve": "all",
          "settings.manage": "all",
        }),
      ),
    ).toEqual({
      canView: true,
      canApprove: true,
      canBook: true,
      canCrew: true,
      canReserve: true,
      canManageSettings: true,
      canBookInternal: true,
    });
  });

  it("should not let a «mine» booker create internal filmings", () => {
    expect(filmingCaps(viewerWith({ "filming.book": "mine" })).canBookInternal).toBe(false);
  });
});
