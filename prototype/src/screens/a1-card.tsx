import Link from "next/link";

import { Panel } from "@/kit/panel";
import { ROWS_SHOWN, type CardContent, type CardDef } from "@/screens/a1-model";
import { Badge } from "@/screens/shared";

interface TodayCardProps {
  card: CardDef;
  content: CardContent;
}

export function TodayCard({ card, content }: TodayCardProps) {
  const isEmpty = content.count === 0;
  const hidden = content.rows.length - ROWS_SHOWN;
  const urgent = content.rows.filter((row) => row.isUrgent).length;
  const hasCount = !isEmpty && card.kind !== "info" && !content.isCountless;
  return (
    <div
      className="a1-card"
      data-kind={card.kind}
      data-empty={isEmpty}
      data-urgent={urgent > 0}
    >
      <Panel
        label={card.title}
        aside={
          hasCount ? (
            <span className="num" aria-label={`${content.count} σε αναμονή`}>
              {content.count}
            </span>
          ) : undefined
        }
      >
        {isEmpty ? (
          <p className="muted a1-empty">{content.emptyText}</p>
        ) : (
          <>
            {content.summary && (
              <p className="muted a1-summary">{content.summary}</p>
            )}
            {content.rows.length > 0 && (
              <ul className="a1-rows">
                {content.rows.slice(0, ROWS_SHOWN).map((row) => (
                  <li
                    key={`${row.label}${row.meta}`}
                    data-urgent={!!row.isUrgent}
                  >
                    <Link href={row.href}>{row.label}</Link>
                    {row.meta && <span className="muted">{row.meta}</span>}
                    {row.isUrgent && <Badge tone="attention">επείγον</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <footer className="a1-card-foot">
          {content.cta && (
            <Link className="button" data-primary href={content.cta.href}>
              {content.cta.label}
            </Link>
          )}
          <Link href={content.allHref}>
            {hidden > 0 ? `Όλα (${content.rows.length}) →` : "Όλα →"}
          </Link>
        </footer>
      </Panel>
    </div>
  );
}

interface CardErrorProps {
  card: CardDef;
  retryHref: string;
}

// Σφάλμα σε μία κάρτα: οι άλλες φορτώνουν κανονικά.
export function CardError({ card, retryHref }: CardErrorProps) {
  return (
    <div className="a1-card" data-kind="error" role="alert">
      <Panel label={card.title} aside="σφάλμα">
        <p className="muted a1-empty">
          Η κάρτα δεν φόρτωσε. Οι υπόλοιπες δεν επηρεάζονται.
        </p>
        <footer className="a1-card-foot">
          <Link className="button" href={retryHref}>
            Ξαναδοκίμασε
          </Link>
        </footer>
      </Panel>
    </div>
  );
}

interface QuietCardsProps {
  cards: readonly CardDef[];
  hrefOf: (card: CardDef) => string;
}

// Οι κάρτες ενέργειας που είναι άδειες μαζεύονται σε μία γραμμή, για να μη γεμίζει η σελίδα με «τίποτα».
export function QuietCards({ cards, hrefOf }: QuietCardsProps) {
  if (cards.length === 0) return null;
  return (
    <p className="a1-quiet">
      <span className="a1-quiet-mark" aria-hidden>
        ✓
      </span>{" "}
      Τίποτα σε αναμονή:{" "}
      {cards.map((card, index) => (
        <span key={card.id}>
          {index > 0 && ", "}
          <Link href={hrefOf(card)}>{card.title}</Link>
        </span>
      ))}
      .
    </p>
  );
}
