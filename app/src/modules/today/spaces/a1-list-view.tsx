import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import "../../finance/spaces/money-lines.css";
import { getTodayClosed } from "../queries";
import { CardError } from "./a1-card";
import { closedNoteOf } from "./a1-closed";
import { lineSubOf } from "./a1-facts";
import { isNewSince, laterLineOf } from "./a1-later";
import { LaterButton, UndoLater } from "./a1-later-buttons";
import { remainingOf, type ListGroup, type ListLine } from "./a1-list";
import type { CardDef } from "./a1-model";
import type { CompanyItem, CompanyState } from "./a1-topline";

// Η Σήμερα ως μία λίστα σε 7 ομάδες (#Σήμερα list): η γραμμή κορυφής κλειστή, κάτω οι ομάδες με γραμμές `ml-line`.

// Το ρήμα του κουμπιού κίνησης ανά κάρτα· όπου δεν υπάρχει, «Άνοιξε».
const ACTION_LABEL: Readonly<Record<string, string>> = {
  unread_messages: "Απάντησε",
  requests_mentions: "Απάντησε",
  to_invoice: "Τιμολόγησε",
  unassigned: "Ανάθεσε",
  versions_to_review: "Δες",
};
const DEFAULT_ACTION = "Άνοιξε";
const RETRY_HREF = "/app";

// Η γραμμή κορυφής (κλειστή) και τα πάνελ της μέσα της: Δείκτες, Πρόγραμμα, Χρήματα, Η ομάδα.
export function TopLine({
  topline,
  panels,
}: {
  topline: string;
  panels: ReactNode;
}) {
  return (
    <details className="a1-topline">
      <summary>{topline}</summary>
      <div className="a1-topline-body">{panels}</div>
    </details>
  );
}

export interface TodayListProps {
  topline: string;
  panels: ReactNode;
  groups: readonly ListGroup[];
  // Οι κάρτες που φορτώθηκαν (και οι χαλασμένες), για τον τίτλο του CardError.
  cards: readonly CardDef[];
  seenAt: string | null;
  // Τα κλειδιά που κρύφτηκαν με «Αργότερα» και η ώρα της στιγμής (για τη γραμμή «ξαναβγαίνουν»).
  later: readonly string[];
  stamp: string;
  company: CompanyState;
  // Οι κάρτες που είναι αποφάσεις (το «Μόνο εσύ μπορείς» της προηγούμενης έκδοσης): μόνο αυτές παίρνουν την ουσία.
  decisionIds: ReadonlySet<string>;
}

function LineRow({
  line,
  seenAt,
  today,
  isDecision,
}: {
  line: ListLine;
  seenAt: string | null;
  today: string;
  isDecision: boolean;
}) {
  const { row, cardId, laterKey } = line;
  const action = ACTION_LABEL[cardId] ?? DEFAULT_ACTION;
  const sub = lineSubOf({ row, cardId, isDecision, today });
  return (
    <div className="ml-line" data-urgent={row.isUrgent || undefined}>
      <span className="ml-main">
        <strong>
          {row.isUrgent && (
            <span className="a1-urgent-mark" role="img" aria-label="επείγον">
              !
            </span>
          )}{" "}
          {row.label}
          {isNewSince(row, seenAt) && <span className="a1-new"> νέο</span>}
        </strong>
        {sub && <small>{sub}</small>}
      </span>
      <span className="ml-quick">
        {row.suggestion && (
          <Link
            href={row.suggestion.href}
            aria-label={`Πρότεινε αυτή την ώρα: ${row.label}`}
          >
            Πρότεινε αυτή την ώρα
          </Link>
        )}
        {laterKey && <LaterButton itemKey={laterKey} label={row.label} />}
        <Link
          data-primary
          href={row.href}
          aria-label={`${action}: ${row.label}`}
        >
          {action}
        </Link>
      </span>
    </div>
  );
}

function GroupBlock({
  group,
  cards,
  seenAt,
  today,
  decisionIds,
}: {
  group: ListGroup;
  cards: readonly CardDef[];
  seenAt: string | null;
  today: string;
  decisionIds: ReadonlySet<string>;
}) {
  const failedCards = group.failed.flatMap((code) =>
    cards.filter((card) => card.id === code),
  );
  return (
    <section className="a1-zone" data-zone={group.id}>
      <h2 className="a1-zone-title">{group.title}</h2>
      <div className="ml-list">
        {failedCards.map((card) => (
          <CardError key={card.id} card={card} retryHref={RETRY_HREF} />
        ))}
        {group.lines.map((line) => (
          <LineRow
            key={`${line.cardId}${line.row.href}${line.row.label}`}
            line={line}
            seenAt={seenAt}
            today={today}
            isDecision={decisionIds.has(line.cardId)}
          />
        ))}
      </div>
      {group.more.map((item) => (
        <p key={item.href} className="a1-quiet">
          <Link href={item.href}>Και {item.count} ακόμα →</Link>
        </p>
      ))}
    </section>
  );
}

function CompanyItemRow({ item }: { item: CompanyItem }) {
  return (
    <li>
      <Link href={item.href}>{item.title}</Link>
      <span className="a1-company-count">{item.count}</span>
    </li>
  );
}

// Η εταιρεία (ομάδα 7) χωρίς επείγον: μία κλειστή γραμμή με όσες κάρτες θέλουν προσοχή, αλλιώς «Όλα λειτουργούν».
function CompanyNote({ company }: { company: CompanyState }) {
  if (company.items.length > 0) {
    return (
      <details className="a1-company">
        <summary>Η εταιρεία: {company.items.length} σε αναμονή</summary>
        <ul className="a1-company-list">
          {company.items.map((item) => (
            <CompanyItemRow key={item.id} item={item} />
          ))}
        </ul>
      </details>
    );
  }
  return company.isClear ? <p className="a1-quiet">Όλα λειτουργούν</p> : null;
}

// «Έκλεισες N» (Σήμερα list): σε δικό του Suspense, ώστε η λίστα να μην περιμένει τη βάση. Αν αποτύχει, τίποτα.
async function ClosedNote({ remaining }: { remaining: number }) {
  const result = await getTodayClosed();
  if (!result.ok || !result.data) return null;
  const note = closedNoteOf({ closed: result.data.closed, remaining });
  return note ? <p className="a1-quiet">{note}</p> : null;
}

export function TodayList({
  topline,
  panels,
  groups,
  cards,
  seenAt,
  later,
  stamp,
  company,
  decisionIds,
}: TodayListProps) {
  const laterLine = laterLineOf(later.length, stamp);
  const today = stamp.slice(0, 10);
  const remaining = remainingOf(groups);
  return (
    <>
      <TopLine topline={topline} panels={panels} />
      <Suspense fallback={null}>
        <ClosedNote remaining={remaining} />
      </Suspense>
      {groups.map((group) => (
        <GroupBlock
          key={group.id}
          group={group}
          cards={cards}
          seenAt={seenAt}
          today={today}
          decisionIds={decisionIds}
        />
      ))}
      <CompanyNote company={company} />
      {laterLine && (
        <div className="a1-quiet a1-later-line">
          {laterLine} · <UndoLater keys={later} />
        </div>
      )}
    </>
  );
}
