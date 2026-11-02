import type { StatProps } from "@/spaces/kit/panel";
import type { Now } from "@/spaces/kit/now-tile";

import { getTodayCounts } from "../queries";
import { cardDefOf } from "./a1-adapter";
import { loadCards } from "./a1-load";
import { besideNow, nowOf } from "./a1-now";
import { pickStats } from "./a1-stats";

export interface SpaceStrip {
  stats: readonly StatProps[];
  now: Now | null;
}

const EMPTY: SpaceStrip = { stats: [], now: null };

// Η λωρίδα ενός Χώρου (prototype `screens/space-strip.ts`): οι αριθμοί και το Τώρα βγαίνουν από τις κάρτες της Σήμερα
// που οδηγούν σε οθόνη του Χώρου, με τους ίδιους κανόνες. Αν η Σήμερα δεν φορτώσει, η λωρίδα απλώς δεν φαίνεται.
export async function getSpaceStrip(codes: readonly string[]): Promise<SpaceStrip> {
  const counts = await getTodayCounts();
  if (!counts.ok || !counts.data) return EMPTY;
  const cards = counts.data.cards.filter((card) => codes.includes(cardDefOf(card).source));
  const loaded = (await loadCards(cards)).filter((item) => !item.failed).map((item) => item.built);
  const now = nowOf(loaded);
  return { stats: pickStats(besideNow(loaded, now)), now };
}
