import { Suspense } from "react";

import { getTodayCard } from "../queries";
import type { TodayCard } from "../view-schema";
import { CardBoundary } from "./card-boundary";
import { CardRetry } from "./card-retry";
import { CardSkeleton } from "./card-skeleton";
import { CardView } from "./card-view";

async function CardContent({ card }: { card: TodayCard }) {
  if (card.failed) return <CardRetry card={card} />;
  const result = await getTodayCard(card.code);
  if (!result.ok) return <CardRetry card={card} />;
  // Η πρόσβαση χάθηκε ανάμεσα στο πλήθος και στην κάρτα: δεν δείχνεται τίποτα.
  if (result.data === null) return null;
  return <CardView card={card} data={result.data} />;
}

// Κάθε κάρτα φορτώνει χωριστά (κανόνας 6): δικό της Suspense και δικό της error boundary.
export function CardSlot({ card }: { card: TodayCard }) {
  return (
    <CardBoundary card={card}>
      <Suspense fallback={<CardSkeleton card={card} />}>
        <CardContent card={card} />
      </Suspense>
    </CardBoundary>
  );
}
