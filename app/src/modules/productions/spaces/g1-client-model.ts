import { periodLabel } from "../helpers";
import type { ProductionCard } from "../types";
import type { View } from "./g1-rows";

// Οι κάρτες Παραγωγών του πελάτη (prototype `screens/g1-client.tsx`), καθαρές συναρτήσεις πάνω στις κάρτες της βάσης.

// Ο πελάτης βλέπει μόνο Ανοιχτές, Παραδομένες, Όλες (prototype CLIENT_VIEWS).
export const CLIENT_VIEWS: readonly View[] = ["open", "delivered", "all"];

// Η λέξη της κατάστασης για τον πελάτη. Η λίστα της βάσης δεν δίνει πότε παραδόθηκε: μόνο «παραδόθηκε».
export const clientStateLabel = (card: ProductionCard): string => {
  if (card.state === "cancelled") return "ακυρώθηκε";
  if (card.state === "open") return "σε εξέλιξη";
  return "παραδόθηκε";
};

const groupLabelOf = (card: ProductionCard): string =>
  card.period ? periodLabel(card.period.starts) : "Εφάπαξ";

export interface ClientGroup {
  label: string;
  cards: readonly ProductionCard[];
}

// Ομαδοποίηση ανά Περίοδο, η πιο πρόσφατη πρώτη· οι εφάπαξ στο τέλος, με τη σειρά της βάσης (νεότερη πρώτη).
export const clientGroupsOf = (
  cards: readonly ProductionCard[],
): ClientGroup[] => {
  const sorted = cards
    .map((card, index) => ({ card, key: card.period?.starts ?? "", index }))
    .sort((a, b) => b.key.localeCompare(a.key) || a.index - b.index)
    .map((entry) => entry.card);
  const labels = [...new Set(sorted.map(groupLabelOf))];
  return labels.map((label) => ({
    label,
    cards: sorted.filter((card) => groupLabelOf(card) === label),
  }));
};
