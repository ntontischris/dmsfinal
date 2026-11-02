import { READINESS } from "@/modules/settings";

import { getTodayCard } from "../queries";
import type { CardData, TodayCard } from "../view-schema";
import { builtOf, needsItems, type Built } from "./a1-adapter";

// Μια κάρτα της «Σήμερα» φορτωμένη: τα στοιχεία της, ή «απέτυχε» (δείχνει «Ξαναδοκίμασε»), ή χάθηκε η πρόσβαση (δεν φαίνεται).
export type Loaded = { built: Built; failed: boolean };

// Ετοιμότητα: η βάση στέλνει μόνο τους κωδικούς των βημάτων· οι ετικέτες είναι του module Ρυθμίσεις (όπως στο cards/health).
const withReadinessLabels = (card: TodayCard, data: CardData): CardData =>
  card.code !== "readiness"
    ? data
    : {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          title: READINESS[item.id]?.label ?? item.title,
          subtitle: READINESS[item.id]?.who ?? item.subtitle,
        })),
      };

const loadOne = async (card: TodayCard): Promise<Loaded | null> => {
  if (card.failed) return { built: builtOf(card, null), failed: true };
  if (!needsItems(card)) return { built: builtOf(card, null), failed: false };
  try {
    const result = await getTodayCard(card.code);
    if (!result.ok) return { built: builtOf(card, null), failed: true };
    // Η πρόσβαση χάθηκε ανάμεσα στο πλήθος και στην κάρτα: δεν δείχνεται τίποτα.
    if (result.data === null) return null;
    return {
      built: builtOf(card, withReadinessLabels(card, result.data)),
      failed: false,
    };
  } catch (error) {
    console.error("today spaces card:", error);
    return { built: builtOf(card, null), failed: true };
  }
};

// Οι ορατές κάρτες με τη σειρά του Χρήστη, όλες μαζί (παράλληλα): το «Τώρα», οι αριθμοί και οι ζώνες του prototype
// χρειάζονται να ξέρουν από πριν ποια γραμμή είναι η πιο επείγουσα. Κάθε κάρτα αποτυγχάνει χωριστά.
export async function loadCards(
  cards: readonly TodayCard[],
): Promise<readonly Loaded[]> {
  const loaded = await Promise.all(
    cards.filter((card) => !card.hidden).map(loadOne),
  );
  return loaded.filter((item): item is Loaded => item !== null);
}
