import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { canSeeSalesReports } from "./sales-access";

const teamWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: "u-team",
  email: "team@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

describe("canSeeSalesReports", () => {
  it("should show sales reports to sales (reports and clients.manage, both mine)", () => {
    expect(
      canSeeSalesReports(
        teamWith({ "reports.view": "mine", "clients.manage": "mine" }),
      ),
    ).toBe(true);
  });

  it("should hide them from the accountant, who sees clients but not opportunities", () => {
    expect(
      canSeeSalesReports(
        teamWith({ "reports.view": "all", "clients.view": "all" }),
      ),
    ).toBe(false);
  });

  it("should hide them without reports.view", () => {
    expect(canSeeSalesReports(teamWith({ "clients.manage": "all" }))).toBe(
      false,
    );
  });

  it("should hide them from anonymous visitors", () => {
    expect(canSeeSalesReports({ status: "anonymous" })).toBe(false);
  });
});
