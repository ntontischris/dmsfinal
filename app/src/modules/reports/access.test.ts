import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { canSeeFinanceReports } from "./access";

const teamWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: "u-team",
  email: "team@example.com",
  team: { name: "Ελένη", isOwner: false, permissions },
});

describe("canSeeFinanceReports", () => {
  it("should show finance reports to the accountant (reports and finance)", () => {
    expect(
      canSeeFinanceReports(
        teamWith({ "reports.view": "all", "finance.view": "all" }),
      ),
    ).toBe(true);
  });

  it("should hide them from sales, who see reports but not finance", () => {
    expect(
      canSeeFinanceReports(
        teamWith({ "reports.view": "mine", "finance.amounts": "mine" }),
      ),
    ).toBe(false);
  });

  it("should hide them without reports.view even with finance", () => {
    expect(
      canSeeFinanceReports(
        teamWith({ "finance.view": "all", "finance.amounts": "all" }),
      ),
    ).toBe(false);
  });

  it("should hide them from anonymous visitors", () => {
    expect(canSeeFinanceReports({ status: "anonymous" })).toBe(false);
  });
});
