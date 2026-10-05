// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «1 Πελάτες και Πωλήσεις».
// Πηγή: 01-roles-and-permissions.md (πίνακας Δικαιωμάτων) και 08-role-guides.md.

import { OPPORTUNITIES, type Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import { SALES_USER_ID, TODAY, type SalesClient } from "@/data/sales";

export interface SalesCaps {
  isScoped: boolean;
  isReadOnly: boolean;
  canManage: boolean;
  canReassign: boolean;
  canMerge: boolean;
  canApprove: boolean;
  canSeeAmounts: boolean;
  canSeeCost: boolean;
  canSeeFinance: boolean;
  canSeeOpportunities: boolean;
  canSeeClientUsers: boolean;
}

export const capsOf = (role: RoleId): SalesCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isSales = role === "sales";
  const isAccountant = role === "accountant";
  return {
    isScoped: isSales,
    isReadOnly: isAccountant,
    canManage: isAdminLike || isSales,
    canReassign: isAdminLike,
    canMerge: isAdminLike,
    canApprove: isAdminLike,
    canSeeAmounts: isAdminLike || isSales || isAccountant,
    canSeeCost: isAdminLike,
    canSeeFinance: isAdminLike || isAccountant,
    canSeeOpportunities: isAdminLike || isSales,
    canSeeClientUsers: isAdminLike,
  };
};

export const isMyOpportunity = (opportunity: Opportunity): boolean =>
  opportunity.ownerId === SALES_USER_ID;

// «Ένας Πελάτης, ένας πωλητής»: Υπεύθυνος του Πελάτη (owner), πρόσβαση μέσω δικής του Ευκαιρίας (granted), ή κατειλημμένος (taken).
export type ClientAccess = "owner" | "granted" | "taken";

export const clientAccessFor = (client: SalesClient): ClientAccess => {
  if (client.ownerId === SALES_USER_ID) return "owner";
  const hasMyOpportunity = OPPORTUNITIES.some(
    (opportunity) =>
      opportunity.clientId === client.id && isMyOpportunity(opportunity),
  );
  return hasMyOpportunity ? "granted" : "taken";
};

export const firstName = (fullName: string): string =>
  fullName.split(" ")[0] ?? fullName;

export const visibleOpportunities = (role: RoleId): readonly Opportunity[] =>
  capsOf(role).isScoped ? OPPORTUNITIES.filter(isMyOpportunity) : OPPORTUNITIES;

export const opportunitiesOfClient = (
  clientId: string,
): readonly Opportunity[] =>
  OPPORTUNITIES.filter((opportunity) => opportunity.clientId === clientId);

export const isForgotten = (opportunity: Opportunity): boolean =>
  opportunity.outcome === "Ανοιχτή" &&
  !!opportunity.nextStep &&
  opportunity.nextStep.due < TODAY;

export const unassignedOpportunities = (): readonly Opportunity[] =>
  OPPORTUNITIES.filter(
    (opportunity) =>
      opportunity.ownerId === null && opportunity.outcome === "Ανοιχτή",
  );
