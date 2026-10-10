import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { calendarCaps } from "./caps";

const teamViewer: Viewer = {
  status: "signed-in",
  userId: "u-team",
  email: "team@example.com",
  team: { name: "Ρένα", isOwner: false, permissions: {} },
};

const clientViewer: Viewer = {
  status: "signed-in",
  userId: "u-client",
  email: "client@example.com",
  team: null,
  clientGrants: {},
};

describe("calendarCaps", () => {
  it("should let a team user see the calendar as a team user", () => {
    expect(calendarCaps(teamViewer)).toEqual({ canSee: true, isTeam: true });
  });

  it("should let a client user see the calendar without the booking permission", () => {
    expect(calendarCaps(clientViewer)).toEqual({ canSee: true, isTeam: false });
  });

  it("should hide the calendar from anonymous visitors", () => {
    expect(calendarCaps({ status: "anonymous" }).canSee).toBe(false);
  });
});
