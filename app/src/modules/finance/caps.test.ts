import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { financeViewOf } from "./caps";

const USER = "44444444-4444-4444-8444-444444444444";

const teamViewer = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: USER,
  email: "team@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

const clientViewer = (
  clientGrants: Record<string, "all" | "mine">,
): Viewer => ({
  status: "signed-in",
  userId: USER,
  email: "client@example.com",
  team: null,
  clientGrants,
});

describe("financeViewOf", () => {
  it("should give the team view to a member who sees finance and all amounts", () => {
    expect(
      financeViewOf(
        teamViewer({ "finance.view": "all", "finance.amounts": "all" }),
      ),
    ).toBe("team");
  });

  it("should give nothing to a team member without the amounts scope all", () => {
    expect(
      financeViewOf(
        teamViewer({ "finance.view": "all", "finance.amounts": "mine" }),
      ),
    ).toBe("none");
  });

  it("should give nothing to sales who do not see finance", () => {
    expect(financeViewOf(teamViewer({ "clients.view": "mine" }))).toBe("none");
  });

  it("should give the client view to a client user who sees finance", () => {
    expect(
      financeViewOf(
        clientViewer({ "c.finance": "all", "c.productions": "all" }),
      ),
    ).toBe("client");
  });

  it("should give nothing to a client user without the finance permission", () => {
    expect(financeViewOf(clientViewer({ "c.productions": "all" }))).toBe(
      "none",
    );
  });

  it("should give nothing to visitors", () => {
    expect(financeViewOf({ status: "anonymous" })).toBe("none");
  });
});
