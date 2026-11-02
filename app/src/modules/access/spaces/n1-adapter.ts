// N1 Ομάδα (νέα εμφάνιση): οι πραγματικοί Χρήστες ομάδας, οι Προσκλήσεις και οι Ρόλοι στα σχήματα της οθόνης του prototype.
// Καθαρές συναρτήσεις· τους κανόνες (ποιος βλέπει, ποιος δίνει τι) τους έχει η βάση και το permissions.ts.

import type { InvitationRow } from "../invitation-schemas";
import { lockReason, type Grants } from "../permissions";
import type { PermissionDef, RoleSummary, TeamUserRow } from "../queries";
import type { TeamUserDates } from "./n1-load";
import { roleNames, roleReachText } from "./team-reach";

export type StatusFilter = "active" | "inactive";

export const pickFilter = (value: string | undefined): StatusFilter =>
  value === "inactive" ? "inactive" : "active";

// Η σελίδα ενός Χρήστη ομάδας.
export const userHref = (userId: string): string =>
  `/app/team/${encodeURIComponent(userId)}`;

export interface N1User {
  id: string;
  href: string;
  name: string;
  email: string;
  roles: string;
  isActive: boolean;
  isSelf: boolean;
  // undefined = δεν φορτώθηκε· null = δεν έχει μπει ποτέ.
  lastSeen: string | null | undefined;
  since: string | undefined;
  deactivatedAt: string | null;
}

export const n1UserOf = (
  user: TeamUserRow,
  roles: readonly RoleSummary[],
  dates: ReadonlyMap<string, TeamUserDates> | null,
  viewerId: string | null,
): N1User => {
  const facts = dates?.get(user.userId);
  return {
    id: user.userId,
    href: userHref(user.userId),
    name: user.name,
    email: user.email,
    roles: roleNames(roles, user.roleIds),
    isActive: user.isActive,
    isSelf: user.userId === viewerId,
    lastSeen: dates === null ? undefined : (facts?.lastSeen ?? null),
    since: facts?.since,
    deactivatedAt: user.deactivatedAt,
  };
};

export const matchesFilter = (user: N1User, filter: StatusFilter): boolean =>
  filter === "active" ? user.isActive : !user.isActive;

export type InvitationState = "εκκρεμεί" | "έληξε";

export interface N1Invitation {
  id: string;
  name: string;
  email: string;
  roles: string;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
  state: InvitationState;
}

// «Σε εκκρεμότητα» = όσες περιμένουν ή έληξαν (οι αποδεκτές και οι ακυρωμένες δεν μένουν στη λίστα).
export const n1InvitationsOf = (
  rows: readonly InvitationRow[],
): readonly N1Invitation[] =>
  rows.flatMap((row) =>
    row.status === "pending" || row.status === "expired"
      ? [
          {
            id: row.id,
            name: row.name,
            email: row.email,
            roles: row.roles.map((role) => role.name).join(" · ") || "—",
            invitedBy: row.invitedBy?.name ?? "—",
            sentAt: row.createdAt,
            expiresAt: row.expiresAt,
            state: row.status === "expired" ? "έληξε" : "εκκρεμεί",
          },
        ]
      : [],
  );

export interface PickerRole {
  id: string;
  name: string;
  description: string;
  reach: string;
  // Γιατί δεν μπορείς να τον δώσεις ή να τον αφαιρέσεις· null = μπορείς.
  reason: string | null;
}

export interface PickerViewer {
  isOwner: boolean;
  grants: Grants;
}

// Οι Ρόλοι ομάδας για το RolePicker, με τον λόγο κλειδώματος όπως θα τον έλεγε η βάση.
export const pickerRolesOf = (
  roles: readonly RoleSummary[],
  permissions: readonly PermissionDef[],
  viewer: PickerViewer,
  isTargetOwner: boolean,
): readonly PickerRole[] => {
  const labelOf = (code: string) =>
    permissions.find((p) => p.code === code)?.label ?? code;
  return roles
    .filter((role) => role.kind === "team")
    .map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      reach: roleReachText(role, permissions),
      reason: lockReason({ role, viewer, isTargetOwner, labelOf }),
    }));
};
