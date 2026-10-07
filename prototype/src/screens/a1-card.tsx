import Link from "next/link";

import { ROWS_SHOWN, type CardContent, type CardDef } from "@/screens/a1-model";

interface TodayCardProps {
  card: CardDef;
  content: CardContent;
}

export function TodayCard({ card, content }: TodayCardProps) {
  const isEmpty = content.count === 0;
  const hidden = content.rows.length - ROWS_SHOWN;
  return (
    <section
      className="card a1-card"
      data-kind={card.kind}
      data-empty={isEmpty}
      aria-labelledby={`a1-${card.id}`}
    >
      <header className="a1-card-head">
        <h2 id={`a1-${card.id}`}>
          <Link href={content.allHref}>{card.title}</Link>
        </h2>
        {!isEmpty && card.kind !== "info" &&
          !content.isCountless && (
          <span className="a1-count" aria-label={`${content.count} σε αναμονή`}>
            {content.count}
          </span>
        )}
      </header>
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
          {hidden > 0 ? `Όλα (${content.rows.length}) →` : "Άνοιγμα →"}
        </Link>
      </footer>
    </section>
  );
}

interface CardErrorProps {
  card: CardDef;
  retryHref: string;
}

// Σφάλμα σε μία κάρτα: οι άλλες φορτώνουν κανονικά.
export function CardError({ card, retryHref }: CardErrorProps) {
  return (
    <section className="card a1-card" data-kind="error" role="alert">
      <header className="a1-card-head">
        <h2>{card.title}</h2>
      </header>
      <p className="muted a1-empty">
        Η κάρτα δεν φόρτωσε. Οι υπόλοιπες δεν επηρεάζονται.
      </p>
      <footer className="a1-card-foot">
        <Link className="button" href={retryHref}>
          Ξαναδοκίμασε
        </Link>
      </footer>
    </section>
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
