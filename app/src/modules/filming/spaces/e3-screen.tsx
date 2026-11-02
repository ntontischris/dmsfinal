import Link from "next/link";

import { getViewer, isClientViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, Meter, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { filmingCaps } from "../caps";
import { historyLines } from "../helpers";
import {
  athensDate,
  athensTime,
  formatDate,
  formatDateTime,
} from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";
import {
  getFilming,
  listCrewBlocked,
  listCrewCandidates,
  listCrewTemplates,
  listEquipmentCandidates,
  listFilmings,
} from "../queries";
import { checkSlot } from "../queries-booking";
import { getSheet } from "../queries-sheet";
import type { FilmingCard, FilmingRow } from "../types";
import { e1FilmingOf } from "./e1-adapter";
import {
  clientStatusLook,
  needsOutcome,
  stateWord,
  statusLook,
} from "./e1-groups";
import { E3Actions } from "./e3-actions";
import { E3ClientActions } from "./e3-client";
import { E3Crew } from "./e3-crew";
import { E3Equipment } from "./e3-equipment";
import { E3InternalNote, E3Sheet } from "./e3-sheet";
import { RESPONSE_WORDS, balanceOf, fmtDay, hoursLabel } from "./e3-model";
import { StatusBadge, responseTone } from "./e3-ui";

import "./e.css";
import "./e3.css";

const HOUR_MS = 3_600_000;

// Από το module Εξοπλισμός, μέσω της σελίδας (το Εξοπλισμός εισάγει ήδη τα Γυρίσματα· έτσι δεν κάνουμε κύκλο).
export interface E3EquipmentSource {
  statusLabels: Readonly<Record<string, string>>;
  listTemplates: () => Promise<
    { ok: true; data: readonly { id: string; name: string }[] } | { ok: false }
  >;
}

// Πελάτης και τίτλος μαζί, χωρίς να επαναλαμβάνεται ο Πελάτης όταν ο τίτλος ήδη τον έχει (prototype `entity-title`).
const clientAndTitle = (clientName: string, title: string): string =>
  title.startsWith(clientName) ? title : `${clientName} — ${title}`;

const ORIGIN_LABELS: Readonly<Record<FilmingCard["origin"], string>> = {
  client: "κράτηση του πελάτη",
  team: "από την ομάδα",
  blocked_time: "από Κλεισμένο χρόνο",
};

const endOf = (card: FilmingCard): string =>
  athensTime(
    new Date(Date.parse(card.startsAt) + card.hours * HOUR_MS).toISOString(),
  );

// Η γραμμή της λίστας για την κάρτα: ίδιοι κανόνες κατάστασης με το E1.
const asListItem = (card: FilmingCard) =>
  e1FilmingOf({
    id: card.id,
    startsAt: card.startsAt,
    hours: card.hours,
    state: card.state,
    client: card.client,
    production: card.production,
    crew: null,
    signals: card.signals,
  });

// Ο πελάτης δεν βλέπει τα εσωτερικά (Προέλευση, Έγκριση, Πραγματική διάρκεια)· βλέπει τον λόγο απόρριψης.
function Header({
  card,
  nowMs,
  isClient,
}: {
  card: FilmingCard;
  nowMs: number;
  isClient: boolean;
}) {
  const clientName = card.client?.name ?? NO_CLIENT_LABEL;
  const look = isClient
    ? clientStatusLook(asListItem(card))
    : statusLook(asListItem(card), nowMs);
  return (
    <Panel
      label={clientAndTitle(clientName, card.production.title)}
      aside={<StatusBadge look={look} />}
    >
      <dl className="dl">
        <dt>Πότε</dt>
        <dd>
          {fmtDay(athensDate(card.startsAt))}, {athensTime(card.startsAt)}–
          {endOf(card)} ({hoursLabel(card.hours)})
        </dd>
        <dt>Πού</dt>
        <dd>{card.location ?? "—"}</dd>
        {card.signals.pendingReschedule && (
          <>
            <dt>Μετάθεση</dt>
            <dd>
              Ζητήθηκε {formatDateTime(card.signals.pendingReschedule.startsAt)}
              · περιμένει έγκριση, η παλιά ώρα κρατιέται
            </dd>
          </>
        )}
        {card.clientNote && (
          <>
            <dt>Σημείωση πελάτη</dt>
            <dd>{card.clientNote}</dd>
          </>
        )}
        {card.agreement && (
          <>
            <dt>Συμφωνία</dt>
            <dd>
              {isClient ? (
                card.agreement.title
              ) : (
                <Link href={hrefOf("D2", { id: card.agreement.id })}>
                  {card.agreement.title}
                </Link>
              )}
            </dd>
          </>
        )}
        <dt>Παραγωγή</dt>
        <dd>
          <Link href={hrefOf("G2", { id: card.production.id })}>
            {card.production.title}
          </Link>
        </dd>
        {!isClient && (
          <>
            <dt>Προέλευση</dt>
            <dd>{ORIGIN_LABELS[card.origin]}</dd>
            <dt>Έγκριση</dt>
            <dd>
              {card.approvedAt
                ? formatDate(card.approvedAt)
                : card.rejectedAt
                  ? `Απορρίφθηκε: ${card.rejectedReason ?? "—"}`
                  : "Δεν έχει εγκριθεί ακόμα"}
            </dd>
          </>
        )}
        {isClient && card.state === "rejected" && card.rejectedReason && (
          <>
            <dt>Λόγος απόρριψης</dt>
            <dd>{card.rejectedReason}</dd>
          </>
        )}
        {!isClient && card.actualHours !== null && (
          <>
            <dt>Πραγματική διάρκεια</dt>
            <dd>{hoursLabel(card.actualHours)}</dd>
          </>
        )}
        {!isClient && card.cancelledAt && (
          <>
            <dt>Ακύρωση</dt>
            <dd>
              {formatDate(card.cancelledAt)}
              {card.cancelledSide === "client" ? " (πελάτης)" : " (ομάδα)"}
              {card.cancelledReason ? `: ${card.cancelledReason}` : ""}
              {card.burned ? " · η Παροχή κάηκε" : ""}
            </dd>
          </>
        )}
      </dl>
    </Panel>
  );
}

// Ο πελάτης βλέπει μόνο τι του μένει, με τις δικές του λέξεις (prototype `CLIENT_WORDS.filmingBalance`).
function ClientBalance({ card }: { card: FilmingCard }) {
  if (!card.provision) return null;
  const balance = balanceOf(card.provision);
  return (
    <Panel
      label="Γυρίσματα που σου αναλογούν"
      aside={
        card.period && (
          <span className="muted">
            Περίοδος {card.period.n} · {formatDate(card.period.starts)}–
            {formatDate(card.period.ends)}
          </span>
        )
      }
    >
      <div className="e3-balance">
        <div>
          <strong>{balance.left}</strong>υπόλοιπα
        </div>
      </div>
      <details className="muted">
        <summary>Πώς μετρούν τα γυρίσματα</summary>Το γύρισμα μετρά από τη
        στιγμή που το κλείνεις και θεωρείται χρησιμοποιημένο όταν γίνει. Αν το
        ακυρώσεις εγκαίρως ή δεν εγκριθεί, σου μένει διαθέσιμο για άλλη μέρα.
      </details>
    </Panel>
  );
}

function Balance({ card }: { card: FilmingCard }) {
  if (!card.provision) return null;
  const balance = balanceOf(card.provision);
  return (
    <Panel
      label={`Παροχή «${balance.kindLabel}»`}
      aside={
        card.period && (
          <span className="muted">
            Περίοδος {card.period.n} · {formatDate(card.period.starts)}–
            {formatDate(card.period.ends)}
          </span>
        )
      }
    >
      <Meter
        label="Καταναλωμένα + δεσμευμένα"
        used={balance.used + balance.reserved}
        total={balance.total}
      />
      <div className="e3-balance">
        <div>
          <strong>{balance.total}</strong>σύνολο
        </div>
        <div>
          <strong>{balance.used}</strong>καταναλωμένα
        </div>
        <div>
          <strong>{balance.reserved}</strong>δεσμευμένα
        </div>
        <div>
          <strong>{balance.left}</strong>υπόλοιπα
        </div>
      </div>
      <details className="muted">
        <summary>Πώς μετρά η Παροχή</summary>Η Παροχή δεσμεύεται από τη στιγμή
        της κράτησης και καταναλώνεται όταν το Γύρισμα σημειωθεί «έγινε». Αν
        ακυρωθεί εγκαίρως ή απορριφθεί, επιστρέφει.
        {card.agreement
          ? ` Όριο ακύρωσης της Συμφωνίας: ${card.agreement.filmingCancelHours} ώρες.`
          : ""}
      </details>
    </Panel>
  );
}

// Για όποιον είναι στο Συνεργείο: πότε, πού, ποιοι πάνε και τι παίρνει (prototype `screens/e3-mine.tsx`).
function Mine({
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
  return (
    <Panel
      label="Είσαι στο Συνεργείο"
      aside={
        <Link className="button" href={hrefOf("E6")}>
          Η όψη μου
        </Link>
      }
    >
      {card.cancelRequest && (
        <p className="e3-warn" role="note">
          Ο πελάτης ζήτησε ακύρωση· περιμένει απόφαση.
        </p>
      )}
      <dl className="dl">
        <dt>Πότε</dt>
        <dd>
          {fmtDay(athensDate(card.startsAt))}, {athensTime(card.startsAt)}–
          {endOf(card)}
        </dd>
        <dt>Πού</dt>
        <dd>{card.location ?? "—"}</dd>
        <dt>Ποιοι πάνε</dt>
        <dd>
          <RowList>
            {card.crew.map((member) => (
              <ListRow
                key={member.userId}
                lead={<Avatar name={member.name} size={28} />}
                title={member.name}
                aside={
                  <Badge tone={responseTone(RESPONSE_WORDS[member.response])}>
                    {RESPONSE_WORDS[member.response]}
                  </Badge>
                }
              />
            ))}
          </RowList>
        </dd>
        <dt>Η απάντησή σου</dt>
        <dd>
          <Badge tone={responseTone(myWord)}>{myWord}</Badge>
        </dd>
        <dt>Τι παίρνω</dt>
        <dd>
          {card.equipment.length === 0 ? (
            "Δεν έχει δεσμευτεί Εξοπλισμός ακόμα."
          ) : (
            <RowList>
              {card.equipment.map((line) => (
                <ListRow
                  key={line.itemId}
                  title={line.name}
                  sub={
                    line.status !== "available"
                      ? `Μην το πάρεις χωρίς να ρωτήσεις: ${statusLabels[line.status] ?? line.status}.`
                      : undefined
                  }
                />
              ))}
            </RowList>
          )}
        </dd>
      </dl>
    </Panel>
  );
}

function History({ card }: { card: FilmingCard }) {
  const lines = historyLines(card.history);
  if (lines.length === 0) return null;
  return (
    <Panel label="Ιστορικό">
      <RowList>
        {lines.map((line) => (
          <ListRow
            key={`${line.at}-${line.text}`}
            lead={formatDateTime(line.at)}
            title={line.text}
            sub={line.actor}
          />
        ))}
      </RowList>
    </Panel>
  );
}

// Τα άλλα ανοιχτά Γυρίσματα, για γρήγορη αλλαγή (prototype: «Άλλα Γυρίσματα»).
function Others({
  rows,
  currentId,
}: {
  rows: readonly FilmingRow[];
  currentId: string;
}) {
  const others = rows.filter((row) => row.id !== currentId);
  if (others.length === 0) return null;
  return (
    <details className="e3-others">
      <summary>Άλλα Γυρίσματα ({others.length})</summary>
      <nav aria-label="Γυρίσματα">
        <ul className="e3-picker">
          {others.map((row) => (
            <li key={row.id}>
              <Link className="chip" href={hrefOf("E3", { id: row.id })}>
                {row.client?.name ?? NO_CLIENT_LABEL} ·{" "}
                {fmtDay(athensDate(row.startsAt))} · {stateWord(row.state)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}

// Οι λίστες υποψηφίων φορτώνουν μόνο όπου το Δικαίωμα της κάρτας τις θέλει (όπως η παλιά σελίδα).
async function loadTools(
  card: FilmingCard,
  canBook: boolean,
  equipment: E3EquipmentSource,
) {
  const canCrew = card.viewerCan.crew;
  const canEquipment = card.viewerCan.equipment;
  const pending = card.signals.pendingReschedule;
  const checksNewTime =
    pending !== null && card.viewerCan.decideReschedule && canBook;
  const [candidates, templates, blocked, items, itemTemplates, newTime, open] =
    await Promise.all([
      canCrew ? listCrewCandidates() : null,
      canCrew ? listCrewTemplates() : null,
      canCrew ? listCrewBlocked(card.startsAt, card.hours) : null,
      canEquipment ? listEquipmentCandidates() : null,
      canEquipment ? equipment.listTemplates() : null,
      checksNewTime
        ? checkSlot(pending.startsAt, pending.hours, card.id)
        : null,
      listFilmings("open"),
    ]);
  return {
    isBroken:
      (candidates !== null && !candidates.ok) ||
      (templates !== null && !templates.ok) ||
      (items !== null && !items.ok),
    candidates: candidates?.ok ? candidates.data : [],
    templates: templates?.ok ? templates.data : [],
    blockedIds: blocked?.ok ? blocked.data : [],
    items: items?.ok ? items.data : [],
    itemTemplates: itemTemplates?.ok
      ? itemTemplates.data.map(({ id, name }) => ({ id, name }))
      : [],
    newTimeProblem: newTime?.ok ? newTime.data.problem : null,
    open: open.ok ? open.data : [],
  };
}

function NotePanel({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <Panel label="Σημειώσεις">
      <E3InternalNote note={note} />
    </Panel>
  );
}

// Το Δελτίο φορτώνει μόνο για όποιον βλέπει το Συνεργείο ή είναι μέλος του (όπως η παλιά σελίδα)· ο πελάτης δεν βλέπει τίποτα.
async function SheetPart({ card }: { card: FilmingCard }) {
  if (card.sheet === null && !card.viewerCan.crew)
    return <NotePanel note={card.internalNote} />;
  const sheet = await getSheet(card.id);
  if (!sheet.ok) return <ErrorNotice what="το Δελτίο" />;
  if (sheet.data === null) return <NotePanel note={card.internalNote} />;
  return (
    <E3Sheet
      filmingId={card.id}
      sheet={sheet.data}
      internalNote={card.internalNote}
    />
  );
}

function Denied() {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>Τα Γυρίσματα τα βλέπει όποιος «Βλέπει Γυρίσματα».</p>
      </StateNotice>
    </div>
  );
}

function Missing() {
  return (
    <div data-spaces>
      <StateNotice kind="empty" title="Δεν βρέθηκε Γύρισμα">
        <p>
          Μπορεί να μην είναι πια στη λίστα σου ή ο σύνδεσμος να είναι λάθος.
        </p>
      </StateNotice>
    </div>
  );
}

// Η όψη του πελάτη (prototype `e3-workbench.tsx` με isClient): κεφαλίδα, «Τι μπορείς να κάνεις», υπόλοιπο. Χωρίς banner
// «έγινε», Συνεργείο, Εξοπλισμό, Δελτίο ή Ιστορικό· καμία λίστα υποψηφίων δεν φορτώνει.
async function ClientFilming({ card }: { card: FilmingCard }) {
  const open = await listFilmings("open");
  return (
    <div data-spaces>
      <Others rows={open.ok ? open.data : []} currentId={card.id} />
      <div className="e3">
        <Header card={card} nowMs={new Date().getTime()} isClient />
        <E3ClientActions card={card} />
        <ClientBalance card={card} />
      </div>
    </div>
  );
}

// E3 Γύρισμα στη νέα εμφάνιση (prototype `screens/E3.tsx` + `e3-workbench.tsx`). Κάθε ενέργεια φαίνεται μόνο όταν το
// viewerCan της βάσης το επιτρέπει.
export async function SpacesFilming({
  id,
  equipment,
}: {
  id: string | null;
  equipment: E3EquipmentSource;
}) {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canView) return <Denied />;
  if (id === null) return <Missing />;
  const filming = await getFilming(id);
  if (!filming.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Γύρισμα" />
      </div>
    );
  if (filming.data === null) return <Missing />;
  const card = filming.data;
  if (isClientViewer(viewer)) return <ClientFilming card={card} />;
  const tools = await loadTools(card, caps.canBook, equipment);
  if (tools.isBroken)
    return (
      <div data-spaces>
        <ErrorNotice what="οι υποψήφιοι του Συνεργείου ή του Εξοπλισμού" />
      </div>
    );
  const viewerId = viewer.status === "signed-in" ? viewer.userId : null;
  const nowMs = new Date().getTime();
  const isCrewView =
    !caps.canApprove &&
    viewerId !== null &&
    card.crew.some((member) => member.userId === viewerId);
  const toolPanels = (
    <>
      {(card.viewerCan.crew || card.crew.length > 0) && (
        <E3Crew
          card={card}
          candidates={tools.candidates}
          templates={tools.templates}
          blockedIds={tools.blockedIds}
          canApprove={caps.canApprove}
        />
      )}
      {(card.viewerCan.equipment || card.equipment.length > 0) && (
        <E3Equipment
          card={card}
          candidates={tools.items}
          templates={tools.itemTemplates}
          statusLabels={equipment.statusLabels}
        />
      )}
      <SheetPart card={card} />
      <History card={card} />
    </>
  );
  return (
    <div data-spaces>
      <Others rows={tools.open} currentId={card.id} />
      <div className="e3">
        {needsOutcome(asListItem(card), nowMs) && (
          <section className="card e3-banner" role="status">
            <strong>Τελείωσε και δεν σημειώθηκε.</strong> Σημείωσε «έγινε» ή
            «δεν έγινε».
          </section>
        )}
        {isCrewView && viewerId && <Mine
            card={card}
            viewerId={viewerId}
            statusLabels={equipment.statusLabels}
          />}
        <Header card={card} nowMs={nowMs} isClient={false} />
        <E3Actions card={card} newTimeProblem={tools.newTimeProblem} />
        {!isCrewView && viewerId && <Mine
            card={card}
            viewerId={viewerId}
            statusLabels={equipment.statusLabels}
          />}
        <Balance card={card} />
        {isCrewView ? (
          <details className="card e3-tools">
            <summary>
              Εργαλεία Γυρίσματος: Συνεργείο, Εξοπλισμός, Δελτίο
            </summary>
            {toolPanels}
          </details>
        ) : (
          toolPanels
        )}
      </div>
    </div>
  );
}
