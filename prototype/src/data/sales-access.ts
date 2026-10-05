// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «1 Πελάτες και Πωλήσεις».
// Πηγή: 01-roles-and-permissions.md (πίνακας Δικαιωμάτων) και 08-role-guides.md.

import { OPPORTUNITIES, type Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import {
  SALES_CLIENTS,
  SALES_USER_ID,
  TODAY,
  type SalesClient,
} from "@/data/sales";

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

// «Με αφορά»: Υπεύθυνος του Πελάτη ή Υπεύθυνος μιας Ευκαιρίας του (01-roles-and-permissions.md, «Πότε κάτι με αφορά»).
export const clientConcernsMe = (client: SalesClient): boolean =>
  client.ownerId === SALES_USER_ID ||
  OPPORTUNITIES.some(
    (opportunity) =>
      opportunity.clientId === client.id && isMyOpportunity(opportunity),
  );

export const visibleClients = (role: RoleId): readonly SalesClient[] =>
  capsOf(role).isScoped
    ? SALES_CLIENTS.filter(clientConcernsMe)
    : SALES_CLIENTS;

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
