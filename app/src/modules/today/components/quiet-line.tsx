import Link from "next/link";

import type { TodayCard } from "../view-schema";

// Οι άδειες κάρτες ενέργειας μαζεύονται σε μία γραμμή, για να μη γεμίζει η σελίδα με «τίποτα».
export function QuietLine({ cards }: { cards: readonly TodayCard[] }) {
  if (cards.length === 0) return null;
  return (
    <p className="m-0 text-sm text-muted-foreground">
      <span aria-hidden="true" className="text-ok">
        ✓
      </span>{" "}
      Τίποτα σε αναμονή:{" "}
      {cards.map((card, index) => (
        <span key={card.code}>
          {index > 0 && ", "}
          <Link href={card.link}>{card.label}</Link>
        </span>
      ))}
      .
    </p>
  );
}
