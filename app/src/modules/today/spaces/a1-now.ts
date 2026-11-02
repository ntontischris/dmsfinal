// Το «Τώρα» της Σήμερα: το ένα πιο επείγον πράγμα που περιμένει τον Χρήστη, με την ενέργεια που το κλείνει.
// Η σειρά των καρτών είναι η προτεραιότητα· χωρίς επείγουσα γραμμή δεν υπάρχει Τώρα.

import type { Now } from "@/spaces/kit/now-tile";

import type { CardContent, CardDef } from "./a1-model";

export type { Now };

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

export function nowOf(built: readonly BuiltCard[]): Now | null {
  for (const { card, content } of built) {
    if (card.kind !== "action") continue;
    const row = content.rows.find((candidate) => candidate.isUrgent);
    if (row)
      return {
        cardId: card.id,
        label: card.title,
        title: row.label,
        detail: row.meta,
        action: "Άνοιξε",
        href: row.href,
      };
  }
  return null;
}

// Οι κάρτες χωρίς αυτή που έγινε Τώρα: οι αριθμοί δίπλα στο κίτρινο λένε κάτι άλλο.
export const besideNow = <T extends BuiltCard>(
  built: readonly T[],
  now: Now | null,
): readonly T[] =>
  now === null ? built : built.filter(({ card }) => card.id !== now.cardId);
