import Link from "next/link";

import { initialsOf } from "./a1-deck-model";
import { BriefLine } from "./a1-lines";
import { ROWS_SHOWN, type CardContent, type CardDef } from "./a1-model";

import { footOf, isOpenOf, urgentRowsOf } from "./a1-client-model";

// Η κάρτα της Σήμερα του Πελάτη στην τελική όψη: κλειστό κουτί με τίτλο, αριθμό και μία φράση· ανοίγει σε γραμμές
// με ρήμα και από κάτω το κουμπί της. Ανοιχτή μόνη της μόνο όταν κάτι επείγει.

export const cardAnchorOf = (card: CardDef): string => `a1-card-${card.id}`;

function CardLines({
  rows,
  isGentle = false,
}: {
  rows: CardContent["rows"];
  isGentle?: boolean;
}) {
  return (
    <ul className="ml-list">
      {rows.slice(0, ROWS_SHOWN).map((row) => (
        <BriefLine
          key={`${row.label}${row.meta}`}
          thumb={initialsOf(row.label) || "·"}
          title={row.label}
          label={row.label}
          sub={row.meta}
          href={row.href}
          isUrgent={!isGentle && !!row.isUrgent}
        />
      ))}
    </ul>
  );
}

function CardBody({ card, content }: { card: CardDef; content: CardContent }) {
  if (content.rows.length > 0)
    return <CardLines rows={content.rows} isGentle={card.isGentle} />;
  // Η δική μου λίστα είναι άδεια, αλλά στην ομάδα κάτι έχει καθυστερήσει: φαίνεται με το όνομα του ανθρώπου, χωρίς κόκκινο.
  if (content.teamRows?.length)
    return <CardLines rows={content.teamRows} isGentle />;
  return null;
}

function CardCount({ card, content }: { card: CardDef; content: CardContent }) {
  const hasCount =
    content.count > 0 && card.kind !== "info" && !content.isCountless;
  if (!hasCount) return null;
  return (
    <span
      className="a1-box-count"
      data-urgent={urgentRowsOf(card, content) > 0 || undefined}
      aria-label={`${content.count} σε αναμονή`}
    >
      {content.count}
    </span>
  );
}

export function TodayCard({
  card,
  content,
}: {
  card: CardDef;
  content: CardContent;
}) {
  const allLabel =
    content.rows.length > ROWS_SHOWN ? `Όλα (${content.rows.length})` : "Όλα";
  return (
    <section className="a1-fold" id={cardAnchorOf(card)}>
      <details className="ml-box" open={isOpenOf(card, content)}>
        <summary>
          <span className="a1-fold-title">
            <h2 className="ml-box-title">{card.title}</h2>
            <small>{footOf(card, content)}</small>
          </span>
          <CardCount card={card} content={content} />
        </summary>
        <CardBody card={card} content={content} />
        <footer className="ml-quick a1-box-foot">
          {content.cta && (
            <Link data-primary href={content.cta.href}>
              {content.cta.label}
            </Link>
          )}
          <Link
            href={content.allHref}
            aria-label={`${allLabel}: ${card.title}`}
          >
            {allLabel} →
          </Link>
        </footer>
      </details>
    </section>
  );
}

interface CardErrorProps {
  card: CardDef;
  retryHref: string;
}

// Σφάλμα σε μία κάρτα: μία γραμμή με «Ξαναδοκίμασε»· οι άλλες φορτώνουν κανονικά.
export function CardError({ card, retryHref }: CardErrorProps) {
  return (
    <div className="ml-line" data-urgent role="alert">
      <span className="ml-thumb" aria-hidden>
        !
      </span>
      <span className="ml-main">
        <strong>{card.title}</strong>
        <small>Η κάρτα δεν φόρτωσε. Οι υπόλοιπες δεν επηρεάζονται.</small>
      </span>
      <span className="ml-amount" />
      <span className="ml-quick">
        <Link href={retryHref}>Ξαναδοκίμασε</Link>
      </span>
    </div>
  );
}

interface QuietCardsProps {
  cards: readonly CardDef[];
  hrefOf: (card: CardDef) => string;
}

// Οι κάρτες ενέργειας που είναι άδειες μαζεύονται σε μία γραμμή, για να μη γεμίζει η σελίδα με «τίποτα».
// Λέει ποιες λίστες είναι άδειες για τον Χρήστη, όχι ότι δεν περιμένει τίποτα γενικά.
export function QuietCards({ cards, hrefOf }: QuietCardsProps) {
  if (cards.length === 0) return null;
  return (
    <p className="a1-quiet">
      <span className="a1-quiet-mark" aria-hidden>
        ✓
      </span>{" "}
      Δεν σε περιμένει τίποτα σε:{" "}
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
