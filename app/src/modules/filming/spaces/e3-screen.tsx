import { getViewer, isClientViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { filmingCaps } from "../caps";
import { athensDate } from "../helpers-time";
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
import {
  Balance,
  ClientBalance,
  Facts,
  Hero,
  Mine,
  NotesAndHistory,
} from "./e3-boxes";
import { E3ClientActions } from "./e3-client";
import { E3Crew } from "./e3-crew";
import { E3Details } from "./e3-details";
import { E3Equipment } from "./e3-equipment";
import { E3Sheet } from "./e3-sheet";
import { DONE_KINDS, doneMessage, fmtDay, type DoneKind } from "./e3-model";

import "./e.css";
import "./e3.css";

// Από το module Εξοπλισμός, μέσω της σελίδας (το Εξοπλισμός εισάγει ήδη τα Γυρίσματα· έτσι δεν κάνουμε κύκλο).
export interface E3EquipmentSource {
  statusLabels: Readonly<Record<string, string>>;
  listTemplates: () => Promise<
    { ok: true; data: readonly { id: string; name: string }[] } | { ok: false }
  >;
}

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

// Τα άλλα ανοιχτά Γυρίσματα, για γρήγορη αλλαγή (prototype: «Άλλα Γυρίσματα»): μία κάρτα «Γύρισμα» με αναζήτηση.
function Others({
  rows,
  currentId,
}: {
  rows: readonly FilmingRow[];
  currentId: string;
}) {
  if (!rows.some((row) => row.id !== currentId)) return null;
  return (
    <FilterBar
      label="Γυρίσματα"
      filters={[
        {
          label: "Γύρισμα",
          isSearchable: true,
          options: rows.map((row) => ({
            label: `${row.client?.name ?? NO_CLIENT_LABEL} · ${fmtDay(athensDate(row.startsAt))} · ${stateWord(row.state)}`,
            href: hrefOf("E3", { id: row.id }),
            isCurrent: row.id === currentId,
          })),
        },
      ]}
    />
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

// Το Δελτίο φορτώνει μόνο για όποιον βλέπει το Συνεργείο ή είναι μέλος του (όπως η παλιά σελίδα)· ο πελάτης δεν βλέπει τίποτα.
async function SheetPart({ card }: { card: FilmingCard }) {
  if (card.sheet === null && !card.viewerCan.crew) return null;
  const sheet = await getSheet(card.id);
  if (!sheet.ok) return <ErrorNotice what="το Δελτίο" />;
  if (sheet.data === null) return null;
  return <E3Sheet filmingId={card.id} sheet={sheet.data} />;
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

// Το μήνυμα μετά από κράτηση ή μετάθεση (`?done=`), όπως το έδειχνε η παλιά σελίδα.
function DoneNotice({
  done,
  card,
}: {
  done: DoneKind | null;
  card: FilmingCard;
}) {
  if (done === null) return null;
  return (
    <p className="e-info" role="status">
      {doneMessage(done, {
        state: card.state,
        hasPendingReschedule: card.signals.pendingReschedule !== null,
      })}
    </p>
  );
}

const doneOf = (value: string | undefined): DoneKind | null =>
  DONE_KINDS.find((kind) => kind === value) ?? null;

// Η όψη του πελάτη (prototype `e3-workbench.tsx` με isClient): κεφαλίδα, «Τι μπορείς να κάνεις», υπόλοιπο. Χωρίς banner
// «έγινε», Συνεργείο, Εξοπλισμό, Δελτίο ή Ιστορικό· καμία λίστα υποψηφίων δεν φορτώνει.
async function ClientFilming({
  card,
  done,
}: {
  card: FilmingCard;
  done: DoneKind | null;
}) {
  const open = await listFilmings("open");
  return (
    <div data-spaces>
      <Others rows={open.ok ? open.data : []} currentId={card.id} />
      <div className="e3 ml-stack">
        <DoneNotice done={done} card={card} />
        <Hero
          card={card}
          look={clientStatusLook(asListItem(card))}
          isCrew={false}
        />
        <E3ClientActions card={card} />
        <Facts card={card} isClient />
        <ClientBalance card={card} />
        <NotesAndHistory card={card} hasHistory={false} />
      </div>
    </div>
  );
}

// E3 Γύρισμα στη νέα εμφάνιση (prototype `screens/E3.tsx` + `e3-workbench.tsx`). Κάθε ενέργεια φαίνεται μόνο όταν το
// viewerCan της βάσης το επιτρέπει.
export async function SpacesFilming({
  id,
  equipment,
  done,
}: {
  id: string | null;
  equipment: E3EquipmentSource;
  done?: string;
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
  if (isClientViewer(viewer))
    return <ClientFilming card={card} done={doneOf(done)} />;
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
  const mine = viewerId && (
    <Mine
      card={card}
      viewerId={viewerId}
      statusLabels={equipment.statusLabels}
    />
  );
  return (
    <div data-spaces>
      <Others rows={tools.open} currentId={card.id} />
      <div className="e3 ml-stack">
        <DoneNotice done={doneOf(done)} card={card} />
        <Hero
          card={card}
          look={statusLook(asListItem(card), nowMs)}
          isCrew={isCrewView}
        />
        {needsOutcome(asListItem(card), nowMs) && (
          <p className="fl-note" role="status">
            <strong>Τελείωσε και δεν σημειώθηκε.</strong> Σημείωσε «έγινε» ή
            «δεν έγινε».
          </p>
        )}
        {isCrewView && mine}
        <E3Actions card={card} newTimeProblem={tools.newTimeProblem} />
        <Facts card={card} isClient={false}>
          <E3Details card={card} />
        </Facts>
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
        {!isCrewView && mine}
        <Balance card={card} />
        <NotesAndHistory card={card} hasHistory />
      </div>
    </div>
  );
}
