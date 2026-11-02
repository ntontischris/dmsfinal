import Link from "next/link";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { ROWS_SHOWN, type CardContent, type CardDef } from "./a1-model";

interface TodayCardProps {
  card: CardDef;
  content: CardContent;
}

export function TodayCard({ card, content }: TodayCardProps) {
  const isEmpty = content.count === 0;
  const hidden = content.rows.length - ROWS_SHOWN;
  // Οι ήπιες κάρτες (ζητούν κάτι από πελάτη) δεν βάφονται κόκκινες.
  const isRed = (isUrgent?: boolean) => !!isUrgent && !card.isGentle;
  const urgent = content.rows.filter((row) => isRed(row.isUrgent)).length;
  const hasCount = !isEmpty && card.kind !== "info" && !content.isCountless;
  const allLabel = hidden > 0 ? `Όλα (${content.rows.length})` : "Όλα";
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
          <>
            {content.teamRows && content.teamRows.length > 0 ? (
              <>
                <p className="a1-summary">{content.emptyText}</p>
                <TeamRows rows={content.teamRows} />
              </>
            ) : (
              <p className="muted a1-empty">{content.emptyText}</p>
            )}
          </>
        ) : (
          <>
            {content.summary && (
              <p className="muted a1-summary">{content.summary}</p>
            )}
            {content.rows.length > 0 && (
              <div className="a1-rows">
                <RowList>
                  {content.rows.slice(0, ROWS_SHOWN).map((row) => (
                    <ListRow
                      key={`${row.label}${row.meta}`}
                      href={row.href}
                      title={row.label}
                      sub={row.meta}
                      isHighlighted={isRed(row.isUrgent)}
                      aside={
                        isRed(row.isUrgent) ? (
                          <span
                            className="a1-urgent-mark"
                            role="img"
                            aria-label="επείγον"
                          >
                            !
                          </span>
                        ) : undefined
                      }
                    />
                  ))}
                </RowList>
              </div>
            )}
          </>
        )}
        <footer className="a1-card-foot">
          {content.cta && (
            <Link className="button" data-primary href={content.cta.href}>
              {content.cta.label}
            </Link>
          )}
          <Link href={content.allHref} aria-label={`${allLabel}: ${card.title}`}>
            {allLabel} →
          </Link>
        </footer>
      </Panel>
    </div>
  );
}

// Η δική μου λίστα είναι άδεια, αλλά στην ομάδα κάτι έχει καθυστερήσει: φαίνεται με το όνομα του ανθρώπου.
function TeamRows({ rows }: { rows: NonNullable<CardContent["teamRows"]> }) {
  return (
    <>
      <div className="a1-rows">
        <RowList>
          {rows.slice(0, ROWS_SHOWN).map((row) => (
            <ListRow
              key={`${row.label}${row.meta}`}
              href={row.href}
              title={row.label}
              sub={row.meta}
            />
          ))}
        </RowList>
      </div>
    </>
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
