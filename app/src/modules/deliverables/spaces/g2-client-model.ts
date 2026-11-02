import type { ClientDeliverableCard } from "../client-types";

// Καθαρές συναρτήσεις της όψης πελάτη για τα Παραδοτέα μιας Παραγωγής (G1 κάρτες, G2 πάνελ). Prototype `screens/g2-sections.tsx`
// και `data/productions-access.ts` progressOf.

// Τα ακυρωμένα δεν φαίνονται στον πελάτη (όπως στο prototype).
export const visibleForClient = (
  cards: readonly ClientDeliverableCard[],
): ClientDeliverableCard[] =>
  cards.filter((card) => card.state !== "cancelled");

// «Reel · γύροι 1/2»· χωρίς Όριο αλλαγών μόνο πόσοι γύροι έγιναν.
export const clientRowSubOf = (card: ClientDeliverableCard): string =>
  [
    card.kind,
    card.roundsLimit === null
      ? `γύροι ${card.roundsUsed}`
      : `γύροι ${card.roundsUsed}/${card.roundsLimit}`,
  ].join(" · ");

export interface ClientProgress {
  total: number;
  approved: number;
  waitingClient: number;
  inWork: number;
}

const EMPTY_PROGRESS: ClientProgress = {
  total: 0,
  approved: 0,
  waitingClient: 0,
  inWork: 0,
};

// Η πρόοδος ανά Παραγωγή. «Σε εργασία» είναι και όσα ζητήθηκαν αλλαγές: για τον πελάτη η δουλειά είναι στην ομάδα.
export const clientProgressByProduction = (
  cards: readonly ClientDeliverableCard[],
): ReadonlyMap<string, ClientProgress> =>
  visibleForClient(cards).reduce((map, card) => {
    const current = map.get(card.productionId) ?? EMPTY_PROGRESS;
    return new Map(map).set(card.productionId, {
      total: current.total + 1,
      approved: current.approved + (card.state === "approved" ? 1 : 0),
      waitingClient:
        current.waitingClient + (card.state === "awaiting_you" ? 1 : 0),
      inWork:
        current.inWork +
        (card.state === "in_progress" || card.state === "changes_requested"
          ? 1
          : 0),
    });
  }, new Map<string, ClientProgress>());
