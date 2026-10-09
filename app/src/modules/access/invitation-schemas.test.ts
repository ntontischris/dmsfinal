import { describe, expect, it } from "vitest";

import {
  clientInviteSchema,
  clientUserRowSchema,
  emailLogRowSchema,
  invitationRowSchema,
  inviteFormSchema,
  membershipRowSchema,
  removeResultSchema,
  teamInviteSchema,
} from "./invitation-schemas";

const UUID = "7d1f2a3e-4b5c-4d6e-8f70-123456789abc";

const invitation = {
  id: UUID,
  kind: "team",
  email: "maria@example.com",
  name: "Μαρία",
  locale: "el",
  roles: [{ id: UUID, name: "Πωλήσεις" }],
  client: null,
  invitedBy: { id: UUID, name: "Γιώργος" },
  createdAt: "2026-10-09T10:00:00Z",
  expiresAt: "2026-10-16T10:00:00Z",
  status: "pending",
  acceptedAt: null,
  existingUserId: null,
};

const clientUser = {
  userId: UUID,
  name: "Νίκος",
  email: "nikos@example.com",
  roleId: UUID,
  roleName: "Πλήρης",
  joinedAt: "2026-10-09T10:00:00Z",
  isCurrent: true,
  invitedBy: null,
  lastSignInAt: null,
};

describe("invitationRowSchema", () => {
  it("δέχεται τη γραμμή όπως τη δίνει η βάση", () => {
    expect(invitationRowSchema.safeParse(invitation).success).toBe(true);
  });

  it("απορρίπτει άγνωστο είδος πρόσκλησης", () => {
    expect(invitationRowSchema.safeParse({ ...invitation, kind: "guest" }).success).toBe(false);
  });

  it("απορρίπτει γραμμή με snake_case κλειδιά (η βάση γράφει camelCase)", () => {
    const snakeCase = { ...invitation, created_at: invitation.createdAt, createdAt: undefined };
    expect(invitationRowSchema.safeParse(snakeCase).success).toBe(false);
  });
});

describe("clientUserRowSchema", () => {
  it("δέχεται τον Χρήστη πελάτη χωρίς τα στοιχεία της ομάδας", () => {
    expect(clientUserRowSchema.safeParse(clientUser).success).toBe(true);
  });
});

describe("membershipRowSchema", () => {
  it("δέχεται τη συμμετοχή με τον επιλεγμένο Πελάτη", () => {
    const row = { clientId: UUID, name: "Acme", roleName: "Πλήρης", isCurrent: true };
    expect(membershipRowSchema.safeParse(row).success).toBe(true);
  });
});

describe("emailLogRowSchema", () => {
  it("δέχεται μόνο τις τρεις καταστάσεις αποστολής", () => {
    const row = { id: UUID, kind: "test", toEmail: "a@b.co", subject: "x", status: "sent", providerId: "local", error: "", sentAt: "2026-10-09T10:00:00Z" };
    expect(emailLogRowSchema.safeParse(row).success).toBe(true);
    expect(emailLogRowSchema.safeParse({ ...row, status: "queued" }).success).toBe(false);
  });
});

describe("removeResultSchema", () => {
  it("δέχεται την απάντηση της αφαίρεσης", () => {
    expect(removeResultSchema.safeParse({ deactivate: true, signatoryWarning: false }).success).toBe(true);
  });
});

describe("φόρμες πρόσκλησης", () => {
  it("κανονικοποιεί το email σε πεζά και κόβει τα κενά", () => {
    const parsed = inviteFormSchema.parse({ name: " Μαρία ", email: " Maria@Example.com ", locale: "en" });
    expect(parsed).toEqual({ name: "Μαρία", email: "maria@example.com", locale: "en" });
  });

  it("θέλει τουλάχιστον έναν Ρόλο ομάδας", () => {
    const base = { name: "Μαρία", email: "maria@example.com", locale: "el", roleIds: [] };
    expect(teamInviteSchema.safeParse(base).success).toBe(false);
  });

  it("θέλει έγκυρο Πελάτη για πρόσκληση Χρήστη πελάτη", () => {
    const base = { name: "Νίκος", email: "nikos@example.com", locale: "el", clientId: "όχι-uuid" };
    expect(clientInviteSchema.safeParse(base).success).toBe(false);
  });
});
