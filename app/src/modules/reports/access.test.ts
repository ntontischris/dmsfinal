import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import {
  canSeeExpenseReports,
  canSeeFinanceReports,
  canSeeProductionReports,
  canSeeProfitReport,
} from "./access";

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

describe("the old-DMS reports (d8)", () => {
  const accountant = teamWith({
    "reports.view": "all",
    "finance.view": "all",
    "finance.amounts": "all",
  });

  it("should show expenses to the accountant, who sees all amounts", () => {
    expect(canSeeExpenseReports(accountant)).toBe(true);
  });

  it("should hide profit from the accountant, who has no cost permission", () => {
    expect(canSeeProfitReport(accountant)).toBe(false);
  });

  it("should show profit when finance and cost are both granted", () => {
    expect(
      canSeeProfitReport(
        teamWith({
          "reports.view": "all",
          "finance.view": "all",
          "finance.cost": "all",
        }),
      ),
    ).toBe(true);
  });

  it("should hide expenses from someone who sees only their own amounts", () => {
    expect(
      canSeeExpenseReports(
        teamWith({ "reports.view": "mine", "finance.amounts": "mine" }),
      ),
    ).toBe(false);
  });

  it("should show productions only with reports and production permissions", () => {
    expect(
      canSeeProductionReports(
        teamWith({ "reports.view": "all", "productions.manage": "mine" }),
      ),
    ).toBe(true);
    expect(
      canSeeProductionReports(teamWith({ "productions.manage": "all" })),
    ).toBe(false);
    expect(canSeeProductionReports({ status: "anonymous" })).toBe(false);
  });
});
