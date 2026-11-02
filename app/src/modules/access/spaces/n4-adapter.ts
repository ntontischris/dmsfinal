// N4 Ρόλοι και Δικαιώματα (νέα εμφάνιση): οι πραγματικοί Ρόλοι και Χρήστες ομάδας στα σχήματα του prototype
// (`screens/n4-shared.tsx`, `n4-role-people.tsx`). Καθαρές συναρτήσεις· τους κανόνες τους ξαναελέγχει η βάση.

import type { RoleKind, RoleSummary, TeamUserRow } from "../queries";

export const ROLES_PATH = "/app/team/roles";

export const roleHref = (roleId: string): string =>
  `${ROLES_PATH}/${encodeURIComponent(roleId)}`;

export const newRoleHref = (kind: RoleKind, from?: string): string => {
  const search = new URLSearchParams({ kind, ...(from ? { from } : {}) });
  return `${ROLES_PATH}/new?${search.toString()}`;
};

export const pickKind = (value: string | undefined): RoleKind =>
  value === "client" ? "client" : "team";

export const KIND_LABEL: Readonly<Record<RoleKind, string>> = {
  team: "ομάδας",
  client: "πελάτη",
};

export const pluralUsers = (count: number): string =>
  count === 1 ? "1 Χρήστης" : `${count} Χρήστες`;

export interface RoleHolder {
  key: string;
  name: string;
  detail: string;
  href: string;
}

const holderOf = (user: TeamUserRow): RoleHolder => ({
  key: user.userId,
  name: user.name,
  detail: user.email,
  href: `/app/team/${encodeURIComponent(user.userId)}`,
});

// Οι ενεργοί Χρήστες ομάδας που έχουν τον Ρόλο.
export const roleHolders = (
  role: RoleSummary,
  users: readonly TeamUserRow[],
): readonly RoleHolder[] =>
  users
    .filter((user) => user.isActive && role.holders.includes(user.userId))
    .map(holderOf);

export interface RoleCandidate extends RoleHolder {
  // Οι Ρόλοι που θα έχει μετά το «Δώσε τον Ρόλο»: οι δικοί του και αυτός.
  roleIds: readonly string[];
}

// Όσοι μπορούν να πάρουν τον Ρόλο: ενεργοί Χρήστες ομάδας χωρίς αυτόν (μόνο για Ρόλους ομάδας).
export const roleCandidates = (
  role: RoleSummary,
  users: readonly TeamUserRow[],
): readonly RoleCandidate[] =>
  role.kind !== "team"
    ? []
    : users
        .filter((user) => user.isActive && !user.roleIds.includes(role.id))
        .map((user) => ({
          ...holderOf(user),
          roleIds: [...user.roleIds, role.id],
        }));

// Γιατί δεν διαγράφεται· null = διαγράφεται. Ίδιοι κανόνες με τη βάση (και με την παλιά σελίδα).
export const deleteBlock = (
  role: RoleSummary,
  holderCount: number,
): string | null => {
  if (role.isOwner)
    return "Ο Ιδιοκτήτης δεν διαγράφεται: υπάρχει πάντα τουλάχιστον ένας.";
  if (role.kind === "client" && role.isBuiltin)
    return "Ο «Πλήρης» δεν διαγράφεται: είναι ο Ρόλος με τον οποίο προσκαλείται αυτόματα ο Υπογράφων της πρώτης υπογεγραμμένης Συμφωνίας. Μπορείς να τον μετονομάσεις.";
  if (holderCount > 0)
    return `Τον έχουν ${pluralUsers(holderCount)}: μετακίνησε πρώτα τους ${pluralUsers(holderCount)} σε άλλον Ρόλο.`;
  return null;
};
