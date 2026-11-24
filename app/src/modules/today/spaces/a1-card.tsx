import Link from "next/link";

import { initialsOf } from "./a1-deck-model";
import { BriefBox, BriefLine } from "./a1-lines";
import { ROWS_SHOWN, type CardContent, type CardDef } from "./a1-model";

// Η κάρτα της Σήμερα του Πελάτη στην τελική όψη: κουτί με τίτλο και αριθμό, γραμμές με ρήμα, και από κάτω το κουμπί της.

export const cardAnchorOf = (card: CardDef): string => `a1-card-${card.id}`;

// Οι ήπιες κάρτες (ζητούν κάτι από πελάτη) δεν βάφονται κόκκινες.
export const urgentRowsOf = (card: CardDef, content: CardContent): number =>
  card.isGentle ? 0 : content.rows.filter((row) => row.isUrgent).length;

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
  if (content.count > 0)
    return (
      <>
        {content.summary && <p className="a1-summary">{content.summary}</p>}
        {content.rows.length > 0 && (
          <CardLines rows={content.rows} isGentle={card.isGentle} />
        )}
      </>
    );
  // Η δική μου λίστα είναι άδεια, αλλά στην ομάδα κάτι έχει καθυστερήσει: φαίνεται με το όνομα του ανθρώπου.
  if (content.teamRows?.length)
    return (
      <>
        <p className="a1-summary">{content.emptyText}</p>
        <CardLines rows={content.teamRows} />
      </>
    );
  return <p className="ml-empty">{content.emptyText}</p>;
}

export function TodayCard({
  card,
  content,
}: {
  card: CardDef;
  content: CardContent;
}) {
  const hasCount =
    content.count > 0 && card.kind !== "info" && !content.isCountless;
  const allLabel =
    content.rows.length > ROWS_SHOWN ? `Όλα (${content.rows.length})` : "Όλα";
  return (
    <BriefBox
      id={cardAnchorOf(card)}
      label={card.title}
      aside={
        hasCount ? (
          <span
            className="a1-box-count"
            data-urgent={urgentRowsOf(card, content) > 0 || undefined}
            aria-label={`${content.count} σε αναμονή`}
          >
            {content.count}
          </span>
        ) : undefined
      }
    >
      <CardBody card={card} content={content} />
      <footer className="ml-quick a1-box-foot">
        {content.cta && (
          <Link data-primary href={content.cta.href}>
            {content.cta.label}
          </Link>
        )}
        <Link href={content.allHref} aria-label={`${allLabel}: ${card.title}`}>
          {allLabel} →
        </Link>
      </footer>
    </BriefBox>
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
