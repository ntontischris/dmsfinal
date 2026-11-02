import { describe, expect, it } from "vitest";

import type { InvitationRow } from "../invitation-schemas";
import type { PermissionDef, RoleSummary, TeamUserRow } from "../queries";
import {
  matchesFilter,
  n1InvitationsOf,
  n1UserOf,
  pickFilter,
  pickerRolesOf,
} from "./n1-adapter";

const role = (overrides: Partial<RoleSummary> = {}): RoleSummary => ({
  id: "r-sales",
  name: "Πωλήσεις",
  description: "Φέρνει πελάτες",
  kind: "team",
  isOwner: false,
  isBuiltin: true,
  grants: { "clients.view": "mine" },
  holders: [],
  ...overrides,
});

const OWNER = role({
  id: "r-owner",
  name: "Ιδιοκτήτης",
  isOwner: true,
  grants: {},
});
const SALES = role();
const CLIENT_ROLE = role({ id: "r-client", name: "Πλήρης", kind: "client" });
const ROLES = [OWNER, SALES, CLIENT_ROLE];

const PERMISSIONS: readonly PermissionDef[] = [
  {
    code: "clients.view",
    kind: "team",
    area: "Πελάτες και Πωλήσεις",
    label: "Βλέπει Πελάτες",
    scopes: ["all", "mine"],
  },
];

const user = (overrides: Partial<TeamUserRow> = {}): TeamUserRow => ({
  userId: "u-1",
  name: "Άννα",
  email: "anna@example.com",
  isActive: true,
  deactivatedAt: null,
  roleIds: ["r-sales"],
  ...overrides,
});

const invitation = (overrides: Partial<InvitationRow> = {}): InvitationRow => ({
  id: "i-1",
  kind: "team",
  email: "k@example.com",
  name: "Κώστας",
  locale: "el",
  roles: [{ id: "r-sales", name: "Πωλήσεις" }],
  client: null,
  invitedBy: { id: "u-0", name: "Γιώργος" },
  createdAt: "2026-10-20T09:00:00Z",
  expiresAt: "2026-10-27T09:00:00Z",
  status: "pending",
  acceptedAt: null,
  existingUserId: null,
  ...overrides,
});

describe("n1UserOf", () => {
  it("should carry roles, self mark and the dates from the base", () => {
    const dates = new Map([
      [
        "u-1",
        { since: "2026-01-02T00:00:00Z", lastSeen: "2026-10-30T08:00:00Z" },
      ],
    ]);
    expect(n1UserOf(user(), ROLES, dates, "u-1")).toMatchObject({
      href: "/app/team/u-1",
      roles: "Πωλήσεις",
      isSelf: true,
      since: "2026-01-02T00:00:00Z",
      lastSeen: "2026-10-30T08:00:00Z",
    });
  });

  it("should say «never» (null) when loaded but never signed in, unknown when not loaded", () => {
    expect(n1UserOf(user(), ROLES, new Map(), null).lastSeen).toBeNull();
    expect(n1UserOf(user(), ROLES, null, null).lastSeen).toBeUndefined();
  });
});

describe("filters", () => {
  it("should default to active and split active from deactivated", () => {
    expect(pickFilter(undefined)).toBe("active");
    expect(pickFilter("inactive")).toBe("inactive");
    const gone = n1UserOf(user({ isActive: false }), ROLES, null, null);
    expect(matchesFilter(gone, "inactive")).toBe(true);
    expect(matchesFilter(gone, "active")).toBe(false);
  });
});

describe("n1InvitationsOf", () => {
  it("should keep only pending and expired invitations", () => {
    const rows = n1InvitationsOf([
      invitation(),
      invitation({ id: "i-2", status: "expired" }),
      invitation({ id: "i-3", status: "accepted" }),
      invitation({ id: "i-4", status: "cancelled" }),
    ]);
    expect(rows.map((row) => [row.id, row.state])).toEqual([
      ["i-1", "εκκρεμεί"],
      ["i-2", "έληξε"],
    ]);
    expect(rows[0]).toMatchObject({ roles: "Πωλήσεις", invitedBy: "Γιώργος" });
  });
});

describe("pickerRolesOf", () => {
  it("should list only team roles, and lock the Owner role for a non-owner", () => {
    const picks = pickerRolesOf(
      ROLES,
      PERMISSIONS,
      { isOwner: false, grants: { "clients.view": "all" } },
      false,
    );
    expect(picks.map((pick) => pick.id)).toEqual(["r-owner", "r-sales"]);
    expect(picks[0].reason).toContain("Ιδιοκτήτης");
    expect(picks[1].reason).toBeNull();
    expect(picks[1].reach).toContain("Πελάτες και Πωλήσεις");
  });

  it("should lock a role whose permissions the viewer lacks, naming the permission", () => {
    const [, sales] = pickerRolesOf(
      ROLES,
      PERMISSIONS,
      { isOwner: false, grants: {} },
      false,
    );
    expect(sales.reason).toContain("«Βλέπει Πελάτες»");
  });
});
