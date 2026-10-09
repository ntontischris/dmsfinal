import { describe, expect, it } from "vitest";

import { grantableTeamRoles } from "./grantable-roles";
import type { RoleSummary } from "./queries";
import type { TeamMember } from "./viewer";

const role = (overrides: Partial<RoleSummary>): RoleSummary => ({
  id: "r",
  name: "Ρόλος",
  description: "",
  kind: "team",
  isOwner: false,
  isBuiltin: false,
  grants: {},
  holders: [],
  ...overrides,
});

const member = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  name: "Άννα",
  isOwner: false,
  permissions: { "access.team": "all", "filming.view": "all" },
  ...overrides,
});

describe("grantableTeamRoles", () => {
  it("δείχνει μόνο Ρόλους ομάδας που καλύπτονται από τα Δικαιώματά μου", () => {
    const roles = [
      role({ id: "a", grants: { "filming.view": "all" } }),
      role({ id: "b", grants: { "equipment.view": "all" } }),
      role({ id: "c", kind: "client", grants: { "filming.view": "all" } }),
    ];
    expect(grantableTeamRoles(roles, member()).map((r) => r.id)).toEqual(["a"]);
  });

  it("κρύβει τον Ρόλο Ιδιοκτήτη από μη Ιδιοκτήτη", () => {
    const roles = [role({ id: "owner", isOwner: true })];
    expect(grantableTeamRoles(roles, member())).toEqual([]);
  });

  it("δείχνει όλους τους Ρόλους ομάδας στον Ιδιοκτήτη", () => {
    const roles = [role({ id: "owner", isOwner: true }), role({ id: "b", grants: { "equipment.view": "all" } })];
    expect(grantableTeamRoles(roles, member({ isOwner: true })).map((r) => r.id)).toEqual(["owner", "b"]);
  });
});
