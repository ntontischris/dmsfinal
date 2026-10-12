import type { ReactNode } from "react";

import type { CardData, TodayCard } from "../view-schema";

// Ένας renderer κάρτας: component χωρίς hooks, που τρέχει ΜΟΝΟ στον server (πρώτη φόρτωση, και το «Ξαναδοκίμασε» μέσω
// server action). Μπορεί άρα να εισάγει από άλλα modules (μόνο από το index.ts τους).
export interface CardViewProps {
  card: TodayCard;
  data: CardData;
}

export type CardRenderer = (props: CardViewProps) => ReactNode;

// code → renderer. Ό,τι λείπει το δείχνει η γενική κάρτα.
export type CardRenderers = Readonly<Record<string, CardRenderer>>;
