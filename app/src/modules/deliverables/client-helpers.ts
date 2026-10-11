import type { Tone } from "@/components/ui/badge";

import { CLIENT_STATE_LABELS } from "./client-labels";
import type {
  ClientDeliverableCard,
  ClientDeliverableState,
  ClientDeliverablesView,
} from "./client-types";
import { deadlineText } from "./helpers";

// Καθαρές συναρτήσεις της όψης πελάτη: κείμενα γύρων, σήματα κατάστασης, ημερομηνία αναμονής.

export const roundsText = (used: number, limit: number | null): string =>
  limit === null ? `Γύροι αλλαγών: ${used}` : `Γύροι αλλαγών: ${used} από ${limit}`;

export const stateTone = (state: ClientDeliverableState): Tone | undefined =>
  state === "awaiting_you" ? "attention" : undefined;

export const stateLabel = (state: ClientDeliverableState): string => CLIENT_STATE_LABELS[state];

// «Περιμένεις από 10/10/2026», ή κενό αν δεν περιμένει.
export const waitingText = (card: ClientDeliverableCard): string | null =>
  card.waitingSince === null ? null : `Περιμένει από ${deadlineText(card.waitingSince)}`;

export const awaitingFirst = (cards: readonly ClientDeliverableCard[]): ClientDeliverableCard[] =>
  [...cards].sort((a, b) => (a.waitingSince ?? "").localeCompare(b.waitingSince ?? ""));

export const answeredText = (name: string): string => `Απάντησε ο/η ${name}.`;

// Τα Παραδοτέα μιας Παραγωγής από την όψη πελάτη: όλα, και όσα περιμένουν τον πελάτη.
export const clientCardsOf = (
  view: ClientDeliverablesView,
  productionId: string,
): { all: ClientDeliverableCard[]; awaiting: ClientDeliverableCard[] } => ({
  all: view.periods
    .flatMap((group) => group.deliverables)
    .filter((card) => card.productionId === productionId),
  awaiting: view.awaitingYou.filter((card) => card.productionId === productionId),
});
