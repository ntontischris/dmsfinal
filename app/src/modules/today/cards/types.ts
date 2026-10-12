import type { ReactNode } from "react";

import type { CardData, TodayCard } from "../view-schema";

// Ένας renderer κάρτας: καθαρό component χωρίς hooks και χωρίς ανάγνωση. Τον χρησιμοποιεί και ο server (πρώτη φόρτωση)
// και ο browser («Ξαναδοκίμασε»), γι' αυτό δεν εισάγει τίποτα server-only.
export interface CardViewProps {
  card: TodayCard;
  data: CardData;
}

export type CardRenderer = (props: CardViewProps) => ReactNode;

// code → renderer. Ό,τι λείπει το δείχνει η γενική κάρτα.
export type CardRenderers = Readonly<Record<string, CardRenderer>>;
