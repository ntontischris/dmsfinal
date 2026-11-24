import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";
import { Badge } from "@/spaces/screens/shared";

import { historyLines } from "../helpers";
import {
  athensDate,
  athensTime,
  formatDate,
  formatDateTime,
} from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";
import type { FilmingCard } from "../types";
import type { StatusLook } from "./e1-groups";
import {
  RESPONSE_WORDS,
  balanceOf,
  fmtDay,
  hoursLabel,
  notesOf,
  replyOf,
  responseTone,
} from "./e3-model";
import { E3Reply } from "./e3-reply";
import { StatusBadge } from "./e3-ui";
import { Box, Line, Lines } from "./ml-parts";

// Τα κουτιά της καρτέλας E3 στην τελική όψη: hero με h1 και κλειστά κουτιά (ml-box) από κάτω.

const HOUR_MS = 3_600_000;

const ORIGIN_LABELS: Readonly<Record<FilmingCard["origin"], string>> = {
  client: "κράτηση του πελάτη",
  team: "από την ομάδα",
  blocked_time: "από Κλεισμένο χρόνο",
};

// Πελάτης και τίτλος μαζί, χωρίς να επαναλαμβάνεται ο Πελάτης όταν ο τίτλος ήδη τον έχει (prototype `entity-title`).
const clientAndTitle = (clientName: string, title: string): string =>
  title.startsWith(clientName) ? title : `${clientName} — ${title}`;

const endOf = (card: FilmingCard): string =>
  athensTime(
    new Date(Date.parse(card.startsAt) + card.hours * HOUR_MS).toISOString(),
  );

const whenOf = (card: FilmingCard): string =>
  `${fmtDay(athensDate(card.startsAt))}, ${athensTime(card.startsAt)}–${endOf(card)}`;

const periodOf = (card: FilmingCard): string | undefined =>
  card.period
    ? `Περίοδος ${card.period.n} · ${formatDate(card.period.starts)}–${formatDate(card.period.ends)}`
    : undefined;

// Η κεφαλίδα: κατάσταση, h1 (Πελάτης — Παραγωγή), πότε/πού και οι σύνδεσμοι προς Παραγωγή και «Η όψη μου».
export function Hero({
  card,
  look,
  isCrew,
}: {
  card: FilmingCard;
  look: StatusLook;
  isCrew: boolean;
}) {
  const clientName = card.client?.name ?? NO_CLIENT_LABEL;
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(clientName)}
      </span>
      <div>
        <StatusBadge look={look} />
        <h1>{clientAndTitle(clientName, card.production.title)}</h1>
        <p className="fl-hero-meta">
          <span>
            {whenOf(card)} ({hoursLabel(card.hours)})
          </span>
          <span>{card.location ?? "Χωρίς χώρο"}</span>
        </p>
      </div>
      <nav className="ml-quick" aria-label="Σύνδεσμοι Γυρίσματος">
        <Link href={hrefOf("G2", { id: card.production.id })}>Παραγωγή</Link>
        {isCrew && <Link href={hrefOf("E6")}>Η όψη μου</Link>}
      </nav>
    </header>
  );
}

function Pair({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const approvalOf = (card: FilmingCard): string =>
  card.approvedAt
    ? formatDate(card.approvedAt)
    : card.rejectedAt
      ? `Απορρίφθηκε: ${card.rejectedReason ?? "—"}`
      : "Δεν έχει εγκριθεί ακόμα";

const cancelOf = (card: FilmingCard): string =>
  `${formatDate(card.cancelledAt ?? "")}${card.cancelledSide === "client" ? " (πελάτης)" : " (ομάδα)"}${card.cancelledReason ? `: ${card.cancelledReason}` : ""}${card.burned ? " · η Παροχή κάηκε" : ""}`;

// Ο πελάτης δεν βλέπει τα εσωτερικά (Προέλευση, Έγκριση, Πραγματική διάρκεια)· βλέπει τον λόγο απόρριψης.
export function Facts({
  card,
  isClient,
}: {
  card: FilmingCard;
  isClient: boolean;
}) {
  const pending = card.signals.pendingReschedule;
  return (
    <Box title="Στοιχεία" hint="Πότε, πού, Συμφωνία" isOpen>
      <dl className="ml-kv">
        <Pair term="Πότε">
          {whenOf(card)} ({hoursLabel(card.hours)})
        </Pair>
        <Pair term="Πού">{card.location ?? "—"}</Pair>
        {pending && (
          <Pair term="Μετάθεση">
            Ζητήθηκε {formatDateTime(pending.startsAt)} · περιμένει έγκριση, η
            παλιά ώρα κρατιέται
          </Pair>
        )}
        {card.clientNote && (
          <Pair term="Σημείωση πελάτη">{card.clientNote}</Pair>
        )}
        {card.agreement && (
          <Pair term="Συμφωνία">
            {isClient ? (
              card.agreement.title
            ) : (
              <Link href={hrefOf("D2", { id: card.agreement.id })}>
                {card.agreement.title}
              </Link>
            )}
          </Pair>
        )}
        {!isClient && (
          <Pair term="Προέλευση">{ORIGIN_LABELS[card.origin]}</Pair>
        )}
        {!isClient && <Pair term="Έγκριση">{approvalOf(card)}</Pair>}
        {isClient && card.state === "rejected" && card.rejectedReason && (
          <Pair term="Λόγος απόρριψης">{card.rejectedReason}</Pair>
        )}
        {!isClient && card.actualHours !== null && (
          <Pair term="Πραγματική διάρκεια">{hoursLabel(card.actualHours)}</Pair>
        )}
        {!isClient && card.cancelledAt && (
          <Pair term="Ακύρωση">{cancelOf(card)}</Pair>
        )}
      </dl>
    </Box>
  );
}

// Ο πελάτης βλέπει μόνο τι του μένει, με τις δικές του λέξεις (prototype `CLIENT_WORDS.filmingBalance`).
export function ClientBalance({ card }: { card: FilmingCard }) {
  if (!card.provision) return null;
  const balance = balanceOf(card.provision);
  return (
    <Box
      title="Γυρίσματα που σου αναλογούν"
      hint={`${balance.left} υπόλοιπα${periodOf(card) ? ` · ${periodOf(card)}` : ""}`}
    >
      <dl className="ml-kv">
        <Pair term="Υπόλοιπα">{balance.left}</Pair>
      </dl>
      <p className="muted">
        Το γύρισμα μετρά από τη στιγμή που το κλείνεις και θεωρείται
        χρησιμοποιημένο όταν γίνει. Αν το ακυρώσεις εγκαίρως ή δεν εγκριθεί, σου
        μένει διαθέσιμο για άλλη μέρα.
      </p>
    </Box>
  );
}

const meterStyle = (used: number, total: number): CSSProperties =>
  ({
    "--v": `${total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0}%`,
  }) as CSSProperties;

export function Balance({ card }: { card: FilmingCard }) {
  if (!card.provision) return null;
  const balance = balanceOf(card.provision);
  const taken = balance.used + balance.reserved;
  return (
    <Box
      title={`Παροχή «${balance.kindLabel}»`}
      hint={`${balance.left} υπόλοιπα από ${balance.total}${periodOf(card) ? ` · ${periodOf(card)}` : ""}`}
    >
      <div className="ml-meter" style={meterStyle(taken, balance.total)}>
        <span>Καταναλωμένα + δεσμευμένα</span>
        <i>
          <b />
        </i>
        <strong>
          {taken}/{balance.total}
        </strong>
      </div>
      <dl className="ml-kv">
        <Pair term="Σύνολο">{balance.total}</Pair>
        <Pair term="Καταναλωμένα">{balance.used}</Pair>
        <Pair term="Δεσμευμένα">{balance.reserved}</Pair>
        <Pair term="Υπόλοιπα">{balance.left}</Pair>
      </dl>
      <p className="muted">
        Η Παροχή δεσμεύεται από τη στιγμή της κράτησης και καταναλώνεται όταν το
        Γύρισμα σημειωθεί «έγινε». Αν ακυρωθεί εγκαίρως ή απορριφθεί,
        επιστρέφει.
        {card.agreement
          ? ` Όριο ακύρωσης της Συμφωνίας: ${card.agreement.filmingCancelHours} ώρες.`
          : ""}
      </p>
    </Box>
  );
}

// Για όποιον είναι στο Συνεργείο: πότε, πού, ποιοι πάνε και τι παίρνει (prototype `screens/e3-mine.tsx`).
export function Mine({
  card,
  viewerId,
  statusLabels,
}: {
  card: FilmingCard;
  viewerId: string;
  statusLabels: Readonly<Record<string, string>>;
}) {
  const slot = card.crew.find((member) => member.userId === viewerId);
  if (!slot) return null;
  const myWord = RESPONSE_WORDS[slot.response];
  const reply = replyOf(slot, card.state, card.sheet?.version ?? null);
  return (
    <Box title="Είσαι στο Συνεργείο" hint={`Η απάντησή σου: ${myWord}`} isOpen>
      {card.cancelRequest && (
        <p className="e3-warn" role="note">
          Ο πελάτης ζήτησε ακύρωση· περιμένει απόφαση.
        </p>
      )}
      <section>
        <h3 className="ml-box-title">Η απάντησή σου</h3>
        {reply ? (
          <E3Reply filmingId={card.id} reply={reply} myWord={myWord} />
        ) : (
          <Badge tone={responseTone(myWord)}>{myWord}</Badge>
        )}
      </section>
      <dl className="ml-kv">
        <Pair term="Πότε">{whenOf(card)}</Pair>
        <Pair term="Πού">{card.location ?? "—"}</Pair>
      </dl>
      <h3 className="ml-box-title">Ποιοι πάνε</h3>
      <Lines label="Ποιοι πάνε">
        {card.crew.map((member) => (
          <Line
            key={member.userId}
            thumb={member.name}
            title={member.name}
            aside={
              <Badge tone={responseTone(RESPONSE_WORDS[member.response])}>
                {RESPONSE_WORDS[member.response]}
              </Badge>
            }
          />
        ))}
      </Lines>
      <h3 className="ml-box-title">Τι παίρνω</h3>
      {card.equipment.length === 0 ? (
        <p className="muted">Δεν έχει δεσμευτεί Εξοπλισμός ακόμα.</p>
      ) : (
        <Lines label="Τι παίρνω">
          {card.equipment.map((line) => (
            <Line
              key={line.itemId}
              thumb={line.name}
              title={line.name}
              sub={
                line.status !== "available"
                  ? `Μην το πάρεις χωρίς να ρωτήσεις: ${statusLabels[line.status] ?? line.status}.`
                  : undefined
              }
            />
          ))}
        </Lines>
      )}
    </Box>
  );
}

// Σημειώσεις (σημείωση πελάτη, εσωτερική, λόγοι) και Ιστορικό σε ένα κουτί.
export function NotesAndHistory({
  card,
  hasHistory,
}: {
  card: FilmingCard;
  hasHistory: boolean;
}) {
  const notes = notesOf(card);
  const lines = hasHistory ? historyLines(card.history) : [];
  return (
    <Box
      title={lines.length > 0 ? "Σημειώσεις και Ιστορικό" : "Σημειώσεις"}
      hint={
        notes.length === 0 ? "Καμία σημείωση" : `${notes.length} σημειώσεις`
      }
    >
      {notes.length === 0 ? (
        <p className="muted">Καμία σημείωση.</p>
      ) : (
        <dl className="ml-kv">
          {notes.map((note) => (
            <div key={note.label}>
              <dt>{note.label}</dt>
              <dd className="e3-note">{note.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {lines.length > 0 && (
        <>
          <h3 className="ml-box-title">Ιστορικό</h3>
          <Lines label="Ιστορικό">
            {lines.map((line) => (
              <Line
                key={`${line.at}-${line.text}`}
                lead={formatDateTime(line.at)}
                title={line.text}
                sub={line.actor}
              />
            ))}
          </Lines>
        </>
      )}
    </Box>
  );
}
