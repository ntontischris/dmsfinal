import { describe, expect, it } from "vitest";

import type { RoleSummary } from "../queries";
import { inviteOptionsOf, pickInviteKind } from "./invite-options";

const role = (overrides: Partial<RoleSummary>): RoleSummary => ({
  id: "r",
  name: "Ρόλος",
  description: "",
  kind: "team",
  isOwner: false,
  isBuiltin: true,
  grants: {},
  holders: [],
  ...overrides,
});

const ROLES = [
  role({ id: "r-owner", name: "Ιδιοκτήτης", isOwner: true }),
  role({ id: "r-sales", name: "Πωλήσεις" }),
  role({ id: "r-full", name: "Πλήρης", kind: "client" }),
  role({ id: "r-view", name: "Μόνο ανάγνωση", kind: "client" }),
];
const CLIENTS = [
  { id: "c-1", name: "Αρτοποιείο Παράδειγμα" },
  { id: "c-2", name: "Καφέ Δοκιμή" },
];
const base = {
  me: { isOwner: true, grants: {} },
  roles: ROLES,
  permissions: [],
  clients: CLIENTS,
};

describe("Πρόσκληση: τι μπορεί να προσκαλέσει ο Χρήστης", () => {
  it("με τα δύο Δικαιώματα προσκαλεί και ομάδα και Πελάτη", () => {
    const options = inviteOptionsOf({
      ...base,
      canTeam: true,
      canClient: true,
    });
    expect(options.team?.roles.map((r) => r.name)).toEqual([
      "Ιδιοκτήτης",
      "Πωλήσεις",
    ]);
    expect(options.client?.roles.map((r) => r.name)).toEqual([
      "Πλήρης",
      "Μόνο ανάγνωση",
    ]);
    expect(options.client?.clients).toHaveLength(2);
  });

  it("χωρίς «Προσκαλεί Χρήστες ομάδας» μένει μόνο ο άνθρωπος Πελάτη", () => {
    const options = inviteOptionsOf({
      ...base,
      canTeam: false,
      canClient: true,
    });
    expect(options.team).toBeNull();
    expect(options.client).not.toBeNull();
  });

  it("ο Πελάτης της σελίδας έρχεται έτοιμος μόνο αν ο Χρήστης τον βλέπει", () => {
    const known = inviteOptionsOf({
      ...base,
      canTeam: false,
      canClient: true,
      presetClientId: "c-2",
    });
    expect(known.client?.presetClientId).toBe("c-2");
    const unknown = inviteOptionsOf({
      ...base,
      canTeam: false,
      canClient: true,
      presetClientId: "c-9",
    });
    expect(unknown.client?.presetClientId).toBeUndefined();
  });

  it("το ?kind= ανοίγει τον άνθρωπο Πελάτη μόνο όταν το ζητά", () => {
    expect(pickInviteKind("client")).toBe("client");
    expect(pickInviteKind(undefined)).toBe("team");
    expect(pickInviteKind("άλλο")).toBe("team");
  });
});
