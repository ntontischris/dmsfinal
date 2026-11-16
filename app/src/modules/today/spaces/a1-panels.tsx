import Link from "next/link";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";

import { formatCents } from "../helpers";
import type { OtherCard, QuietCard } from "./a1-brief";
import { suggestionFactOf } from "./a1-facts";
import type { CardContent, CardDef } from "./a1-model";
import type { Programme } from "./a1-programme";

// Τα κομμάτια της Σήμερα της ομάδας (#241). Η σειρά δείχνει το επείγον, όχι σημάδια σε κάθε γραμμή.

const MONEY_SHOWN = 3;

interface MoveSuggestionsProps {
  decisions: readonly { card: CardDef; content: CardContent }[];
}

// Ακύρωση ↔ μετάθεση (Σ9): όπου μια θέση που αδειάζει χωρά ανοιχτή μετάθεση, το «Πρότεινε αυτή την ώρα» (μόνο πρόταση,
// ανοίγει το Γύρισμα). Τα ίδια τα αιτήματα είναι στη λίστα «Τι πρέπει να κάνω τώρα» (Αιτήματα γυρίσματος).
export function MoveSuggestions({ decisions }: MoveSuggestionsProps) {
  const rows = decisions
    .filter(({ card }) => card.id === "filming_approvals")
    .flatMap(({ card, content }) =>
      content.rows
        .filter((row) => row.suggestion)
        .map((row) => ({ row, fact: suggestionFactOf({ ...row, cardId: card.id }) })),
    );
  if (rows.length === 0) return null;
  return (
    <div className="a1-brief-panel" data-part="suggestions">
      <Panel label="Θέσεις που χωράνε μετάθεση">
        <RowList>
          {rows.map(({ row, fact }) => (
            <ListRow
              key={`${row.href}${row.label}`}
              title={row.label}
              sub={fact ?? undefined}
              aside={
                row.suggestion && (
                  <Link
                    className="button"
                    data-ghost="true"
                    href={row.suggestion.href}
                    aria-label={`Πρότεινε αυτή την ώρα: ${row.label}`}
                  >
                    Πρότεινε αυτή την ώρα
                  </Link>
                )
              }
            />
          ))}
        </RowList>
      </Panel>
    </div>
  );
}

export function ProgrammePanel({
  programme,
  href,
}: {
  programme: Programme;
  href: string;
}) {
  const dayWord = programme.day === "today" ? "σήμερα" : "αύριο";
  return (
    <div className="a1-brief-panel" data-part="programme">
      <Panel label="Το πρόγραμμα">
        <p className="a1-day">{programme.heading}</p>
        {programme.slots.length === 0 ? (
          <p className="muted a1-empty">
            Κανένα Γύρισμα {dayWord}.
            {programme.next && (
              <>
                {" "}
                Επόμενο Γύρισμα: {programme.next.when}
                {programme.next.label ? ` — ${programme.next.label}` : ""}.{" "}
                <Link href={programme.next.href}>Άνοιγμα</Link>
              </>
            )}
          </p>
        ) : (
          <div className="a1-rows">
            <RowList>
              {programme.slots.map((slot) => (
                <ListRow
                  key={`${slot.href}${slot.time}`}
                  lead={<span className="a1-time">{slot.time}</span>}
                  title={slot.label}
                  href={slot.href}
                  sub={slot.note}
                />
              ))}
            </RowList>
          </div>
        )}
        <footer className="a1-card-foot">
          <Link href={href}>Όλη η εβδομάδα →</Link>
        </footer>
      </Panel>
    </div>
  );
}

// Όταν τα Χρήματα (today_money) δεν φόρτωσαν: οι γραμμές της κάρτας «Ληξιπρόθεσμα Τιμολόγια».
export function MoneyPanel({ content }: { content: CardContent }) {
  return (
    <div className="a1-brief-panel" data-part="money">
      <Panel label="Χρήματα" aside={content.count}>
        <p className="muted a1-summary">Ληξιπρόθεσμα Τιμολόγια</p>
        <div className="a1-rows">
          <RowList>
            {content.rows.slice(0, MONEY_SHOWN).map((row) => (
              <ListRow
                key={`${row.href}${row.label}`}
                title={row.label}
                href={row.href}
                sub={row.note}
                aside={
                  row.amountCents !== undefined ? (
                    <span className="a1-amount">
                      {formatCents(row.amountCents)}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </RowList>
        </div>
        <footer className="a1-card-foot">
          <Link href={content.allHref}>Όλα τα τιμολόγια →</Link>
        </footer>
      </Panel>
    </div>
  );
}

interface OthersFoldProps {
  others: readonly OtherCard[];
  quiet: readonly QuietCard[];
  healthOk: QuietCard | null;
}

// Όλες οι υπόλοιπες κάρτες σε μία κλειστή γραμμή: τίτλος, πλήθος, σύνδεσμος.
export function OthersFold({ others, quiet, healthOk }: OthersFoldProps) {
  if (others.length + quiet.length === 0 && !healthOk) return null;
  return (
    <details className="a1-others">
      <summary>
        {others.length > 0 ? `Και άλλα ${others.length}` : "Και άλλα"}
      </summary>
      {others.length > 0 && (
        <ul className="a1-other-list">
          {others.map((other) => (
            <li key={other.id}>
              <Link href={other.isFailed ? "/app" : other.href}>
                {other.title}
              </Link>
              <span className="a1-other-count">
                {other.isFailed ? "δεν φόρτωσε" : other.count}
              </span>
            </li>
          ))}
        </ul>
      )}
      {healthOk && (
        <p className="a1-quiet">
          <span className="a1-quiet-mark" aria-hidden>
            ✓
          </span>{" "}
          <Link href={healthOk.href}>{healthOk.title}</Link>: όλα λειτουργούν.
        </p>
      )}
      {quiet.length > 0 && (
        <p className="a1-quiet">
          <span className="a1-quiet-mark" aria-hidden>
            ✓
          </span>{" "}
          Δεν σε περιμένει τίποτα σε:{" "}
          {quiet.map((card, index) => (
            <span key={card.id}>
              {index > 0 && ", "}
              <Link href={card.href}>{card.title}</Link>
            </span>
          ))}
          .
        </p>
      )}
    </details>
  );
}
