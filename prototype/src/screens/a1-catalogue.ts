// A1: ο κατάλογος των καρτών με την προεπιλεγμένη σειρά, η ίδια για όλους.
// Πρώτα ό,τι περιμένει απόφαση από εμένα και μπλοκάρει άλλους, μετά η δουλειά μου,
// μετά τα χρήματα και η Γνώση, και στο τέλος η εβδομάδα μου.

import {
  clientBalanceCard,
  clientFilmingsCard,
  clientProvisionsCard,
  clientRequestsCard,
  clientWaitingCard,
} from "@/screens/a1-cards-client";
import {
  deletionsCard,
  filmingApprovalsCard,
  healthCard,
  proposalApprovalsCard,
  readinessCard,
  unassignedCard,
} from "@/screens/a1-cards-decide";
import {
  chargesCard,
  forgottenCard,
  hoursCard,
  myDeliverablesCard,
  overdueCard,
  proposalsCard,
  requestsCard,
  reviewCard,
  toInvoiceCard,
  unansweredCard,
  unreadCard,
  weekFilmingsCard,
} from "@/screens/a1-cards-work";
import type { CardDef } from "@/screens/a1-model";

export const CARD_CATALOGUE: readonly CardDef[] = [
  healthCard,
  readinessCard,
  proposalApprovalsCard,
  filmingApprovalsCard,
  deletionsCard,
  unassignedCard,
  myDeliverablesCard,
  reviewCard,
  requestsCard,
  unreadCard,
  forgottenCard,
  proposalsCard,
  chargesCard,
  toInvoiceCard,
  overdueCard,
  hoursCard,
  unansweredCard,
  weekFilmingsCard,
  clientWaitingCard,
  clientBalanceCard,
  clientRequestsCard,
  clientFilmingsCard,
  clientProvisionsCard,
];
