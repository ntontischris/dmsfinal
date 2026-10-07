// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «16 Ομάδα και Πρόσβαση», και οι κανόνες του.
// Χωρίς κλιμάκωση: όποιος προσκαλεί ή αλλάζει Ρόλους Χρήστη δίνει μόνο Ρόλους που δεν ξεπερνούν τα δικά του Δικαιώματα.
// Πηγές: κεφ. 1 «Ομάδα και Πρόσβαση: λεπτομέρειες κανόνων», ADR 0001, ADR 0007.

import { FILMINGS, PRODUCTIONS } from "@/data/filming";
import { OPPORTUNITIES } from "@/data/opportunities";
import { DELIVERABLES, TASKS } from "@/data/productions";
import { stateOf } from "@/data/productions-access";
import { SALES_CLIENTS, TODAY } from "@/data/sales";
import type { RoleId } from "@/data/roles";
import {
  CLIENT_MEMBERSHIPS,
  CURRENT_CLIENT_USER,
  INVITATIONS,
  PERMISSIONS,
  ROLE_DEFS,
  TEAM_USERS,
  type ClientMembership,
  type Invitation,
  type OpenAssignments,
  type RoleDef,
  type Scope,
  type TeamUser,
} from "@/data/team";

export { TODAY };

// Ο Χρήστης ομάδας πίσω από κάθε ρόλο της εναλλαγής.
export const USER_OF_ROLE: Readonly<Partial<Record<RoleId, string>>> = {
  owner: "giorgos",
  admin: "dimitris",
  production: "aris",
  sales: "anna",
  accountant: "eleni",
};

export interface TeamCaps {
  canManageTeam: boolean;
  canManageClientUsers: boolean;
  isOwner: boolean;
  isClient: boolean;
}

export const teamCapsOf = (role: RoleId): TeamCaps => ({
  canManageTeam: role === "owner" || role === "admin",
  canManageClientUsers: role === "owner" || role === "admin",
  isOwner: role === "owner",
  isClient: role === "client",
});

export const findRoleDef = (id: string): RoleDef | undefined =>
  ROLE_DEFS.find((def) => def.id === id);

export const roleNames = (ids: readonly string[]): string =>
  ids.map((id) => findRoleDef(id)?.name ?? id).join(" · ");

export const findTeamUser = (id: string | undefined): TeamUser | undefined =>
  TEAM_USERS.find((user) => user.id === id);

export const teamUserName = (id: string): string =>
  findTeamUser(id)?.name ?? "—";

// Τα Δικαιώματα ενός Χρήστη από όλους τους Ρόλους του: ισχύει το ευρύτερο Εύρος.
export const grantsOf = (
  roleIds: readonly string[],
): Readonly<Record<string, Scope>> =>
  roleIds
    .map((id) => findRoleDef(id)?.grants ?? {})
    .reduce<Record<string, Scope>>((merged, grants) => {
      const next = { ...merged };
      Object.entries(grants).forEach(([perm, scope]) => {
        next[perm] = next[perm] === "Ό" ? "Ό" : scope;
      });
      return next;
    }, {});

export const covers = (mine: Scope | undefined, needed: Scope): boolean =>
  mine === "Ό" || (mine === "Α" && needed === "Α");

export const isOwnerUser = (user: TeamUser): boolean =>
  user.roleIds.some((id) => findRoleDef(id)?.isOwner);

// Ποιον Ρόλο ομάδας μπορεί να δώσει ο actor: ο Ιδιοκτήτης όλους· οι άλλοι όσους καλύπτουν τα δικά τους Δικαιώματα, ποτέ Ιδιοκτήτη.
export const canGrantRole = (actor: TeamUser, def: RoleDef): boolean => {
  if (def.kind !== "ομάδας") return false;
  if (isOwnerUser(actor)) return true;
  if (def.isOwner) return false;
  const mine = grantsOf(actor.roleIds);
  return Object.entries(def.grants).every(([perm, scope]) =>
    covers(mine[perm], scope),
  );
};

export const actorOf = (role: RoleId): TeamUser | undefined =>
  findTeamUser(USER_OF_ROLE[role]);

export const teamRoles = (): readonly RoleDef[] =>
  ROLE_DEFS.filter((def) => def.kind === "ομάδας");

export const clientRoles = (): readonly RoleDef[] =>
  ROLE_DEFS.filter((def) => def.kind === "πελάτη");

export const activeOwners = (): readonly TeamUser[] =>
  TEAM_USERS.filter((user) => user.status === "ενεργός" && isOwnerUser(user));

export type DeactivationBlock =
  "self" | "last-owner" | "owner-by-non-owner" | null;

// Γιατί δεν γίνεται η απενεργοποίηση (ή null αν γίνεται).
export const deactivationBlock = (
  actor: TeamUser,
  target: TeamUser,
): DeactivationBlock => {
  if (actor.id === target.id) return "self";
  if (isOwnerUser(target) && !isOwnerUser(actor)) return "owner-by-non-owner";
  if (isOwnerUser(target) && activeOwners().length <= 1) return "last-owner";
  return null;
};

// Ό,τι επιστρέφει για νέα ανάθεση: υπολογίζεται από τα δεδομένα τη στιγμή της απενεργοποίησης.
export const assignmentsOf = (id: string): OpenAssignments => ({
  clients: SALES_CLIENTS.filter((client) => client.ownerId === id).length,
  opportunities: OPPORTUNITIES.filter(
    (o) => o.outcome === "Ανοιχτή" && o.ownerId === id,
  ).length,
  productions: PRODUCTIONS.filter(
    (p) => p.ownerId === id && stateOf(p) === "ανοιχτή",
  ).length,
  tasks: TASKS.filter((t) => t.assigneeId === id && !t.doneAt).length,
  deliverables: DELIVERABLES.filter(
    (d) =>
      d.assigneeId === id &&
      (d.state === "σε εργασία" || d.state === "αναμένει πελάτη"),
  ).length,
  crews: FILMINGS.filter(
    (f) =>
      f.date >= TODAY &&
      (f.state === "προγραμματισμένο" || f.state === "αναμένει έγκριση") &&
      f.crew.some((slot) => slot.personId === id),
  ).length,
});

export type InvitationState = "εκκρεμεί" | "έληξε";

export const invitationState = (invitation: Invitation): InvitationState =>
  invitation.expiresAt < TODAY ? "έληξε" : "εκκρεμεί";

export const teamInvitations = (): readonly Invitation[] =>
  INVITATIONS.filter((inv) => inv.kind === "ομάδας");

export const clientInvitations = (clientId: string): readonly Invitation[] =>
  INVITATIONS.filter(
    (inv) => inv.kind === "πελάτη" && inv.clientId === clientId,
  );

export const membershipsOfClient = (
  clientId: string,
): readonly ClientMembership[] =>
  CLIENT_MEMBERSHIPS.filter((m) => m.clientId === clientId);

export const otherClientsOf = (
  email: string,
  clientId: string,
): readonly string[] =>
  CLIENT_MEMBERSHIPS.filter(
    (m) => m.email === email && m.clientId !== clientId,
  ).map((m) => m.clientId);

// «Ποιος προσκάλεσε» σε ανθρώπινη μορφή: σύστημα (Υπογράφων), μέλος ομάδας ή συνάδελφος.
export const invitedByLabel = (invitedBy: string): string => {
  if (invitedBy === "system") return "αυτόματα, ως Υπογράφων";
  if (invitedBy.includes("@")) {
    return invitedBy === CURRENT_CLIENT_USER
      ? "από τη Μαρία Παπαδάκη (συνάδελφος)"
      : `από συνάδελφο (${invitedBy})`;
  }
  return `από ${teamUserName(invitedBy)}`;
};

export const permissionAreas = (kind: RoleDef["kind"]): readonly string[] => [
  ...new Set(PERMISSIONS.filter((p) => p.kind === kind).map((p) => p.area)),
];

export const usersWithRole = (roleId: string): number =>
  TEAM_USERS.filter((u) => u.status === "ενεργός" && u.roleIds.includes(roleId))
    .length + CLIENT_MEMBERSHIPS.filter((m) => m.roleId === roleId).length;
