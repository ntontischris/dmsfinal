import { DASH, moneyOrDash } from "./format";
import type { OpportunityKind } from "./sales-schema";

// Καθαρές συναρτήσεις των Αναφορών πωλήσεων. Οι κρίσεις (Εύρος, ποσά, ποσοστά) τις κάνει η βάση.

export const NO_MANAGER = "Χωρίς υπεύθυνο";
export const NO_PROPOSAL = "Χωρίς πρόταση";

export const opportunityHref = (opportunityId: string): string =>
  `/app/pipeline/${encodeURIComponent(opportunityId)}`;

// Μηνιαίο ποσό με «/μήνα»· null (χωρίς «Βλέπει ποσά») → «—».
export const monthlyOrDash = (value: number | null): string =>
  value === null ? DASH : `${moneyOrDash(value)} /μήνα`;

// Η αξία μιας Ευκαιρίας: χωρίς πρόταση το λέει ρητά, χωρίς ποσά «—», αλλιώς μηνιαία ή εφάπαξ.
export const opportunityValue = (
  kind: OpportunityKind,
  value: number | null,
): string => {
  if (kind === null) return NO_PROPOSAL;
  return kind === "monthly" ? monthlyOrDash(value) : moneyOrDash(value);
};

export const managerLabel = (name: string | null): string => name ?? NO_MANAGER;
