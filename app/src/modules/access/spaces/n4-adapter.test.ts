import { describe, expect, it } from "vitest";

import type { RoleSummary, TeamUserRow } from "../queries";
import { EMPTY_USAGE, usageText, type RoleUsage } from "../role-usage";
import {
  deleteBlock,
  deletePlan,
  moveLabel,
  moveTargets,
  newRoleHref,
  pickKind,
  pluralUsers,
  roleCandidates,
  roleHolders,
} from "./n4-adapter";

const role = (overrides: Partial<RoleSummary> = {}): RoleSummary => ({
  id: "r-1",
  name: "Μοντέρ",
  description: "",
  kind: "team",
  isOwner: false,
  isBuiltin: false,
  grants: {},
  holders: [],
  ...overrides,
});

const user = (overrides: Partial<TeamUserRow> = {}): TeamUserRow => ({
  userId: "u-1",
  name: "Άννα",
  email: "anna@example.com",
  isActive: true,
  deactivatedAt: null,
  roleIds: [],
  ...overrides,
});

describe("holders and candidates", () => {
  const users = [
    user({ userId: "u-1", roleIds: ["r-1"] }),
    user({ userId: "u-2", name: "Νίκος", roleIds: ["r-2"] }),
    user({ userId: "u-3", name: "Λένα", isActive: false, roleIds: ["r-1"] }),
  ];
  const current = role({ holders: ["u-1", "u-3"] });

  it("should list only active holders, linking to their page", () => {
    expect(roleHolders(current, users)).toEqual([
      {
        key: "u-1",
        name: "Άννα",
        detail: "anna@example.com",
        href: "/app/team/u-1",
      },
    ]);
  });

  it("should offer active users without the role, keeping their roles plus this one", () => {
    expect(
      roleCandidates(current, users).map((c) => [c.key, c.roleIds]),
    ).toEqual([["u-2", ["r-2", "r-1"]]]);
  });

  it("should offer nobody for a client role", () => {
    expect(roleCandidates(role({ kind: "client" }), users)).toEqual([]);
  });
});

const usage = (overrides: Partial<RoleUsage> = {}): RoleUsage => ({
  ...EMPTY_USAGE,
  ...overrides,
});

describe("deleteBlock and deletePlan", () => {
  it("should never delete the Owner or the built-in client role", () => {
    expect(deleteBlock(role({ isOwner: true }))).toContain("Ιδιοκτήτης");
    expect(deleteBlock(role({ kind: "client", isBuiltin: true }))).toContain(
      "Πλήρης",
    );
    expect(deletePlan(role({ isOwner: true }), usage()).kind).toBe("blocked");
  });

  it("should let a built-in team role be deleted like any other", () => {
    expect(deleteBlock(role({ isBuiltin: true }))).toBeNull();
  });

  it("should delete a role nobody holds straight away", () => {
    expect(deletePlan(role(), usage())).toEqual({ kind: "free" });
  });

  it("should ask to move people, counting team and client users", () => {
    const plan = deletePlan(role(), usage({ teamUsers: 2, clientUsers: 1 }));
    expect(plan).toEqual({
      kind: "move",
      people: 3,
      usage: "2 Χρήστες ομάδας και 1 Χρήστη πελάτη",
    });
    if (plan.kind === "move")
      expect(moveLabel(plan)).toBe("Μετακίνησε τους 3 Χρήστες σε…");
  });

  it("should still ask to move when only invitations or articles hold it", () => {
    const plan = deletePlan(role(), usage({ invitations: 1, knowledge: 2 }));
    expect(plan).toEqual({
      kind: "move",
      people: 0,
      usage: "1 ανοιχτή πρόσκληση και 2 στοιχεία της Γνώσης",
    });
    if (plan.kind === "move") expect(moveLabel(plan)).toBe("Μετακίνησέ τα σε…");
  });
});

describe("moveTargets", () => {
  it("should offer other roles of the same kind, never the Owner or itself", () => {
    const roles = [
      role({ id: "owner", name: "Ιδιοκτήτης", isOwner: true }),
      role({ id: "r-1" }),
      role({ id: "r-2", name: "Παραγωγή" }),
      role({ id: "c-1", name: "Πλήρης", kind: "client" }),
    ];
    expect(moveTargets(role(), roles)).toEqual([
      { id: "r-2", name: "Παραγωγή" },
    ]);
  });
});

describe("usageText", () => {
  it("should join the parts the same way as the database", () => {
    expect(usageText(usage())).toBe("");
    expect(usageText(usage({ teamUsers: 1 }))).toBe("1 Χρήστη ομάδας");
    expect(
      usageText(
        usage({ teamUsers: 3, clientUsers: 2, invitations: 2, knowledge: 1 }),
      ),
    ).toBe(
      "3 Χρήστες ομάδας, 2 Χρήστες πελάτη, 2 ανοιχτές προσκλήσεις και 1 στοιχείο της Γνώσης",
    );
  });
});

describe("links and words", () => {
  it("should build the new-role link with kind and source", () => {
    expect(newRoleHref("client")).toBe("/app/team/roles/new?kind=client");
    expect(newRoleHref("team", "r-1")).toBe(
      "/app/team/roles/new?kind=team&from=r-1",
    );
    expect(pickKind("client")).toBe("client");
    expect(pickKind("x")).toBe("team");
  });

  it("should say one or many users", () => {
    expect(pluralUsers(1)).toBe("1 Χρήστης");
    expect(pluralUsers(3)).toBe("3 Χρήστες");
  });
});
