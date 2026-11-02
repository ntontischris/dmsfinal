import { describe, expect, it } from "vitest";

import type { RoleSummary, TeamUserRow } from "../queries";
import {
  deleteBlock,
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

describe("deleteBlock", () => {
  it("should never delete the Owner or the built-in client role", () => {
    expect(deleteBlock(role({ isOwner: true }), 0)).toContain("Ιδιοκτήτης");
    expect(deleteBlock(role({ kind: "client", isBuiltin: true }), 0)).toContain(
      "Πλήρης",
    );
  });

  it("should block while someone holds the role, and allow it otherwise", () => {
    expect(deleteBlock(role(), 2)).toBe(
      "Τον έχουν 2 Χρήστες: μετακίνησε πρώτα τους 2 Χρήστες σε άλλον Ρόλο.",
    );
    expect(deleteBlock(role(), 0)).toBeNull();
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
