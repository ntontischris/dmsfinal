// N4 Ρόλοι και Δικαιώματα (νέα εμφάνιση): οι πραγματικοί Ρόλοι και Χρήστες ομάδας στα σχήματα του prototype
// (`screens/n4-shared.tsx`, `n4-role-people.tsx`). Καθαρές συναρτήσεις· τους κανόνες τους ξαναελέγχει η βάση.

import type { RoleKind, RoleSummary, TeamUserRow } from "../queries";
import {
  usagePeople,
  usageText,
  usageTotal,
  type RoleUsage,
} from "../role-usage";

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

// Γιατί δεν διαγράφεται ποτέ· null = διαγράφεται (ίσως με μετακίνηση). Ίδιοι κανόνες με τη βάση (role_delete).
export const deleteBlock = (role: RoleSummary): string | null => {
  if (role.isOwner)
    return "Ο Ιδιοκτήτης δεν διαγράφεται: υπάρχει πάντα τουλάχιστον ένας.";
  if (role.kind === "client" && role.isBuiltin)
    return "Ο «Πλήρης» δεν διαγράφεται: είναι ο Ρόλος με τον οποίο προσκαλείται αυτόματα ο Υπογράφων της πρώτης υπογεγραμμένης Συμφωνίας. Μπορείς να τον μετονομάσεις.";
  return null;
};

export interface MoveTarget {
  id: string;
  name: string;
}

// Πού μπορούν να πάνε όσοι έχουν τον Ρόλο: άλλος Ρόλος ίδιου είδους, όχι ο Ιδιοκτήτης.
export const moveTargets = (
  role: RoleSummary,
  roles: readonly RoleSummary[],
): readonly MoveTarget[] =>
  roles
    .filter((r) => r.kind === role.kind && r.id !== role.id && !r.isOwner)
    .map((r) => ({ id: r.id, name: r.name }));

export type DeletePlan =
  | { kind: "blocked"; reason: string }
  | { kind: "free" }
  | { kind: "move"; people: number; usage: string };

// Τι δείχνει η «Διαγραφή Ρόλου»: ποτέ (με τον λόγο), αμέσως (δεν τον έχει κανείς), ή μετακίνηση και διαγραφή.
export const deletePlan = (role: RoleSummary, usage: RoleUsage): DeletePlan => {
  const reason = deleteBlock(role);
  if (reason) return { kind: "blocked", reason };
  if (usageTotal(usage) === 0) return { kind: "free" };
  return { kind: "move", people: usagePeople(usage), usage: usageText(usage) };
};

// «Μετακίνησε τους 3 σε…»· χωρίς ανθρώπους (μόνο προσκλήσεις ή Γνώση) λέει τι μετακινείται.
export const moveLabel = (plan: Extract<DeletePlan, { kind: "move" }>): string =>
  plan.people > 0
    ? `Μετακίνησε ${plan.people === 1 ? "τον 1 Χρήστη" : `τους ${plan.people} Χρήστες`} σε…`
    : "Μετακίνησέ τα σε…";
