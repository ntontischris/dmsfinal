// Τι βλέπει κάθε Ρόλος (prototype `screens/n1-invite-check.ts`), από τα πραγματικά Δικαιώματα: ανά περιοχή «όλα»,
// «όσα τον αφορούν» ή τίποτα. Καθαρές συναρτήσεις· ο κατάλογος Δικαιωμάτων έρχεται από τη βάση (permissions).

import type { Grants, Scope } from "../permissions";
import type { PermissionDef, RoleKind, RoleSummary } from "../queries";

export type AreaReach = Scope | null;

// Οι περιοχές ενός είδους Ρόλου, με τη σειρά του καταλόγου.
export const permissionAreas = (
  permissions: readonly PermissionDef[],
  kind: RoleKind,
): readonly string[] => [
  ...new Set(permissions.filter((p) => p.kind === kind).map((p) => p.area)),
];

export interface RoleReach {
  sees: readonly string[];
  hidden: readonly string[];
  isAll: boolean;
}

// Οι ενότητες που ανοίγει ο Ρόλος, υπολογισμένες από τα Δικαιώματά του.
export const roleReach = (
  role: Pick<RoleSummary, "isOwner" | "kind" | "grants">,
  permissions: readonly PermissionDef[],
): RoleReach => {
  if (role.isOwner) return { sees: [], hidden: [], isAll: true };
  const isSeen = (area: string) =>
    permissions.some((p) => p.area === area && p.code in role.grants);
  const areas = permissionAreas(permissions, role.kind);
  return {
    sees: areas.filter(isSeen),
    hidden: areas.filter((area) => !isSeen(area)),
    isAll: false,
  };
};

// Τι σημαίνει «όσα τον αφορούν» σε κάθε περιοχή, με συγκεκριμένες λέξεις.
const MINE_IN_AREA: Readonly<Record<string, string>> = {
  "Πελάτες και Πωλήσεις": "μόνο Πελάτες και Ευκαιρίες όπου είναι Υπεύθυνος",
  Συμφωνίες: "μόνο των δικών του Πελατών και Ευκαιριών",
  Γυρίσματα: "μόνο των δικών του Πελατών και των Παραγωγών όπου είναι Μέλος",
  Εξοπλισμός: "μόνο για τα δικά του Γυρίσματα",
  Ημερολόγιο: "μόνο το δικό του",
  Παραγωγές: "μόνο όπου είναι Μέλος",
  Παραδοτέα: "μόνο των Παραγωγών όπου είναι Μέλος",
  Οικονομικά: "μόνο ποσά των δικών του Συμφωνιών",
  Μηνύματα: "μόνο Συνομιλίες των δικών του Πελατών και Παραγωγών",
  Αναφορές: "μόνο τα δικά του νούμερα",
};

const mineText = (area: string): string =>
  MINE_IN_AREA[area] ?? "μόνο όσα τον αφορούν";

// Ανά περιοχή ομάδας: «all» αν κάποιο Δικαίωμα της περιοχής δίνεται για όλα, «mine» αν μόνο για όσα τον αφορούν, αλλιώς null.
export const reachRow = (
  grants: Grants,
  permissions: readonly PermissionDef[],
): Readonly<Record<string, AreaReach>> =>
  Object.fromEntries(
    permissionAreas(permissions, "team").map((area) => {
      const scopes = permissions
        .filter((p) => p.area === area && p.code in grants)
        .map((p) => grants[p.code]);
      const scope: AreaReach = scopes.includes("all")
        ? "all"
        : scopes.length > 0
          ? "mine"
          : null;
      return [area, scope];
    }),
  );

// «Βλέπει: … Δεν βλέπει: …», με το Εύρος γραμμένο δίπλα σε κάθε περιοχή που δεν είναι για όλα.
const reachText = (
  grants: Grants,
  permissions: readonly PermissionDef[],
): string => {
  const row = Object.entries(reachRow(grants, permissions));
  const sees = row
    .filter(([, scope]) => scope !== null)
    .map(([area, scope]) =>
      scope === "mine" ? `${area} (${mineText(area)})` : area,
    );
  const hidden = row
    .filter(([, scope]) => scope === null)
    .map(([area]) => area);
  const seen = `Βλέπει: ${sees.join(", ")}.`;
  return hidden.length === 0
    ? `${seen} Τίποτα κρυφό.`
    : `${seen} Δεν βλέπει: ${hidden.join(", ")}.`;
};

export const roleReachText = (
  role: Pick<RoleSummary, "isOwner" | "grants">,
  permissions: readonly PermissionDef[],
): string =>
  role.isOwner
    ? "Βλέπει και κάνει τα πάντα."
    : reachText(role.grants, permissions);

// Η ένωση των Δικαιωμάτων πολλών Ρόλων: όπου δύο δίνουν το ίδιο, ισχύει το ευρύτερο Εύρος.
export const grantsOf = (
  roles: readonly Pick<RoleSummary, "grants">[],
): Grants =>
  roles.reduce<Readonly<Record<string, Scope>>>(
    (merged, role) => ({
      ...merged,
      ...Object.fromEntries(
        Object.entries(role.grants).map(([code, scope]) => [
          code,
          merged[code] === "all" ? "all" : scope,
        ]),
      ),
    }),
    {},
  );

// Τι βλέπει ένας Χρήστης από όλους τους Ρόλους του μαζί (ισχύει το ευρύτερο Εύρος).
export const userReachText = (
  roles: readonly Pick<RoleSummary, "isOwner" | "grants">[],
  permissions: readonly PermissionDef[],
): string => {
  if (roles.some((role) => role.isOwner)) return "Βλέπει και κάνει τα πάντα.";
  const text = reachText(grantsOf(roles), permissions);
  return roles.length > 1
    ? `${text} Οι Ρόλοι προστίθενται: όπου δύο Ρόλοι δίνουν το ίδιο, ισχύει το ευρύτερο.`
    : text;
};

// Τα ονόματα των Ρόλων ενός Χρήστη, με τη σειρά της λίστας Ρόλων.
export const roleNames = (
  roles: readonly Pick<RoleSummary, "id" | "name">[],
  roleIds: readonly string[],
): string =>
  roles
    .filter((role) => roleIds.includes(role.id))
    .map((role) => role.name)
    .join(" · ") || "—";
