import { describe, expect, it } from "vitest";

import type { ClientUserRow, InvitationRow } from "../invitation-schemas";
import {
  colleagueInvitedBy,
  n2InvitationsOf,
  n2MembersOf,
  teamInvitedBy,
} from "./n2-adapter";

const user = (overrides: Partial<ClientUserRow> = {}): ClientUserRow => ({
  userId: "u-maria",
  name: "Μαρία Παπαδάκη",
  email: "maria@example.com",
  roleId: "r-full",
  roleName: "Πλήρης",
  joinedAt: "2026-10-01T09:00:00Z",
  isCurrent: true,
  invitedBy: { id: "u-anna", name: "Άννα Δημητρίου" },
  lastSignInAt: "2026-10-20T08:00:00Z",
  ...overrides,
});

const invitation = (overrides: Partial<InvitationRow> = {}): InvitationRow => ({
  id: "inv-1",
  kind: "client",
  email: "chara@example.com",
  name: "Χαρά Τσολάκη",
  locale: "el",
  roles: [{ id: "r-view", name: "Μόνο προβολή" }],
  client: { id: "c-1", name: "Κυψέλη Καφέ" },
  invitedBy: { id: "u-anna", name: "Άννα Δημητρίου" },
  createdAt: "2026-10-25T10:00:00Z",
  expiresAt: "2026-11-01T10:00:00Z",
  status: "pending",
  acceptedAt: null,
  existingUserId: null,
  ...overrides,
});

describe("n2MembersOf", () => {
  it("should mark the signed-in user as me and keep who invited them", () => {
    const [me, other] = n2MembersOf(
      [user(), user({ userId: "u-nikos", invitedBy: null })],
      "u-maria",
    );
    expect(me).toMatchObject({ isMe: true, invitedBy: "Άννα Δημητρίου" });
    expect(other).toMatchObject({ isMe: false, invitedBy: null });
  });
});

describe("n2InvitationsOf", () => {
  it("should keep only pending and expired invitations", () => {
    const rows = n2InvitationsOf(
      [
        invitation(),
        invitation({ id: "inv-2", status: "expired" }),
        invitation({ id: "inv-3", status: "accepted" }),
        invitation({ id: "inv-4", status: "cancelled" }),
      ],
      teamInvitedBy,
    );
    expect(rows.map((row) => [row.id, row.state])).toEqual([
      ["inv-1", "εκκρεμεί"],
      ["inv-2", "έληξε"],
    ]);
  });

  it("should call an invitation without a role «Πλήρης»", () => {
    const [row] = n2InvitationsOf([invitation({ roles: [] })], teamInvitedBy);
    expect(row?.roles).toBe("Πλήρης");
  });
});

describe("invited-by labels", () => {
  it("should name the team member for the team and say automatic without one", () => {
    expect(teamInvitedBy({ id: "u-anna", name: "Άννα" })).toBe("από Άννα");
    expect(teamInvitedBy(null)).toBe("αυτόματα");
  });

  it("should hide team names from the client but name a colleague", () => {
    const labelOf = colleagueInvitedBy(n2MembersOf([user()], "u-maria"));
    expect(labelOf({ id: "u-maria", name: "Μαρία Παπαδάκη" })).toBe(
      "από Μαρία Παπαδάκη",
    );
    expect(labelOf({ id: "u-anna", name: "Άννα Δημητρίου" })).toBe(
      "από την ομάδα της Devre Media",
    );
  });
});
