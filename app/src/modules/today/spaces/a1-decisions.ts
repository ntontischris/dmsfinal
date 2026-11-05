// «Μόνο εσύ μπορείς» (#241 Σ2): οι γραμμές των καρτών απόφασης σε μία λίστα, με σειρά σημασίας.
// Πρώτα ό,τι έχει ποσό (μεγαλύτερο πρώτα), μετά το παλαιότερο, μετά τα υπόλοιπα με τη σειρά των καρτών.

import type { CardContent, CardDef, CardRow } from "./a1-model";

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

export interface Decision extends CardRow {
  cardId: string;
  cardTitle: string;
}

export interface RankedDecisions {
  shown: readonly Decision[];
  // Όλες οι αποφάσεις, από τα πλήθη των καρτών (οι γραμμές κάθε κάρτας είναι λίγες).
  total: number;
  more: { count: number; href: string } | null;
}

export const DECISIONS_SHOWN = 5;

const classOf = (row: CardRow): number =>
  row.amountCents !== undefined ? 0 : row.at !== undefined ? 1 : 2;

const timeOf = (row: CardRow): number => Date.parse(row.at ?? "");

const byImportance = (a: Decision, b: Decision): number =>
  classOf(a) - classOf(b) ||
  (b.amountCents ?? 0) - (a.amountCents ?? 0) ||
  (classOf(a) === 1 ? timeOf(a) - timeOf(b) : 0);

// Το «Και N ακόμα» οδηγεί στη λίστα της κάρτας που κρύβει τις περισσότερες.
const moreHrefOf = (
  cards: readonly BuiltCard[],
  shown: readonly Decision[],
): string => {
  const hiddenIn = ({ card, content }: BuiltCard) =>
    content.count - shown.filter((row) => row.cardId === card.id).length;
  return cards.reduce((best, item) =>
    hiddenIn(item) > hiddenIn(best) ? item : best,
  ).content.allHref;
};

export function rankDecisions(cards: readonly BuiltCard[]): RankedDecisions {
  const rows = cards.flatMap(({ card, content }) =>
    content.rows.map((row) => ({
      ...row,
      cardId: card.id,
      cardTitle: card.title,
    })),
  );
  const shown = [...rows].sort(byImportance).slice(0, DECISIONS_SHOWN);
  const total = cards.reduce((sum, { content }) => sum + content.count, 0);
  const rest = total - shown.length;
  return {
    shown,
    total,
    more: rest > 0 ? { count: rest, href: moreHrefOf(cards, shown) } : null,
  };
}
