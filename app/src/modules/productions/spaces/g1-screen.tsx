import Link from "next/link";

import { getViewer, type Viewer } from "@/modules/access";
import { costsCaps, listCostRows } from "@/modules/costs";
import {
  clientProgressByProduction,
  deliverablesCaps,
  listClientDeliverables,
  listDeliverableQueue,
} from "@/modules/deliverables";
import { athensDate, filmingCaps, listOpenFilmings } from "@/modules/filming";
import { hrefOf, type HrefParams } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { productionsCaps } from "../caps";
import { listOwnerCandidates, listProductions } from "../queries";
import type { OwnerCandidate, ProductionCard } from "../types";
import {
  NO_SIGNALS,
  VIEWS,
  countByProduction,
  matches,
  nextFilmingsOf,
  ofClient,
  parseView,
  sortFor,
  toRow,
  visibleViews,
  type G1Signals,
  type View,
} from "./g1-rows";
import { parseMode } from "./board-model";
import { G1ClientCards } from "./g1-client";
import { CLIENT_VIEWS } from "./g1-client-model";
import { G1BoardSection, G1ModeSwitch, G1WorkloadSection } from "./g1-modes";
import { G1Team } from "./g1-team";

import "./g1.css";

// Η διεύθυνση όπως τη δίνει η σελίδα· μετρούν μόνο οι απλές τιμές.
type RawQuery = Readonly<Record<string, string | string[] | undefined>>;

interface G1Query {
  view?: string;
  tab?: string;
  internal?: string;
  client?: string;
  mode?: string;
}

const textOf = (value: string | string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

const g1QueryOf = (raw: RawQuery): G1Query => ({
  view: textOf(raw.view),
  tab: textOf(raw.tab),
  internal: textOf(raw.internal),
  client: textOf(raw.client),
  mode: textOf(raw.mode),
});

const EMPTY_SCOPED = "Καμία Παραγωγή δεν σε αφορά σε αυτή την προβολή.";
const EMPTY_TEXT = "Δεν υπάρχει Παραγωγή σε αυτή την προβολή.";

const scopeOf = (viewer: Viewer): string | undefined =>
  viewer.status === "signed-in"
    ? viewer.team?.permissions["productions.manage"]
    : undefined;

// Τα σήματα της λίστας από τρεις αναγνώσεις, μόνο όσες δικαιούται ο θεατής. Αν μία δεν φορτώσει, απλώς λείπει το σήμα της.
async function loadSignals(viewer: Viewer): Promise<G1Signals> {
  const canSeeCost = costsCaps(viewer).canView;
  const [filmings, review, needsHours, overrun] = await Promise.all([
    filmingCaps(viewer).canView ? listOpenFilmings() : null,
    deliverablesCaps(viewer).canReview ? listDeliverableQueue("review") : null,
    canSeeCost ? listCostRows("needs_hours") : null,
    canSeeCost ? listCostRows("overrun") : null,
  ]);
  const next = filmings?.ok
    ? nextFilmingsOf(filmings.data, new Date().toISOString())
    : new Map<string, string>();
  return {
    nextFilming: new Map(
      [...next].map(([id, startsAt]) => [id, athensDate(startsAt)]),
    ),
    inReview: review?.ok ? countByProduction(review.data) : new Map(),
    needsHours: new Set(
      needsHours?.ok ? needsHours.data.map((row) => row.productionId) : [],
    ),
    overrun: new Set(
      overrun?.ok
        ? overrun.data
            .filter((row) => row.signals.overrun)
            .map((row) => row.productionId)
        : [],
    ),
  };
}

// Ο Υπεύθυνος της νέας Εσωτερικής: ο ίδιος ο θεατής, αν μπορεί να είναι Υπεύθυνος.
const defaultOwnerOf = (
  viewer: Viewer,
  people: readonly OwnerCandidate[],
): string => {
  const me = viewer.status === "signed-in" ? viewer.userId : "";
  return people.some((person) => person.id === me) ? me : "";
};

function ViewTabs({
  views,
  active,
  all,
  signals,
  clientId,
}: {
  views: readonly { id: View; label: string }[];
  active: View;
  all: readonly ProductionCard[];
  signals: G1Signals;
  clientId: string | undefined;
}) {
  return (
    <nav className="tabs" aria-label="Προβολή Παραγωγών">
      {views.map((item) => (
        <Link
          key={item.id}
          className="tab"
          aria-current={item.id === active ? "page" : undefined}
          href={hrefOf("G1", {
            view: item.id === "open" ? undefined : item.id,
            client: clientId,
          })}
        >
          {item.label} (
          {all.filter((card) => matches(item.id, card, signals)).length})
        </Link>
      ))}
    </nav>
  );
}

function ClientFilter({ name, view }: { name: string; view: View }) {
  const params: HrefParams = { view: view === "open" ? undefined : view };
  return (
    <p className="g1-filter">
      <Link
        className="button"
        aria-label={`Αφαίρεση φίλτρου Πελάτη ${name}`}
        href={hrefOf("G1", params)}
      >
        Πελάτης: {name} ✕
      </Link>
    </p>
  );
}

const EMPTY_CLIENT =
  "Δεν υπάρχουν Παραγωγές σε αυτή την προβολή. Ανοίγουν μόνες τους με τη Συμφωνία σου.";

// Η όψη πελάτη: οι Παραγωγές του (χωρίς Εσωτερικές) σε κάρτες, με την πρόοδο από την όψη πελάτη των Παραδοτέων
// και το επόμενο Γύρισμα από τη λίστα Γυρισμάτων του (ίδιες αναγνώσεις με τις παλιές H3 και E1 πελάτη).
async function ClientProductions({
  viewer,
  query,
}: {
  viewer: Viewer;
  query: G1Query;
}) {
  const [productions, deliverables, filmings] = await Promise.all([
    listProductions({ state: null, internalOnly: false }),
    listClientDeliverables(),
    filmingCaps(viewer).canView ? listOpenFilmings() : null,
  ]);
  if (!productions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="οι Παραγωγές" />
      </div>
    );
  const all = productions.data.filter((card) => !card.isInternal);
  const progress = clientProgressByProduction(
    deliverables.ok
      ? deliverables.data.periods.flatMap((period) => period.deliverables)
      : [],
  );
  const next = filmings?.ok
    ? nextFilmingsOf(filmings.data, new Date().toISOString())
    : new Map<string, string>();
  const views = VIEWS.filter((view) => CLIENT_VIEWS.includes(view.id));
  const wanted = parseView(query);
  const active = views.some((view) => view.id === wanted) ? wanted : "open";
  const shown = sortFor(
    active,
    all.filter((card) => matches(active, card, NO_SIGNALS)),
  );
  return (
    <div data-spaces>
      <ViewTabs
        views={views}
        active={active}
        all={all}
        signals={NO_SIGNALS}
        clientId={undefined}
      />
      {shown.length === 0 ? (
        <StateNotice kind="empty" title="Καμία Παραγωγή εδώ.">
          {EMPTY_CLIENT}
        </StateNotice>
      ) : (
        <G1ClientCards
          cards={shown}
          progress={progress}
          nextFilming={
            new Map([...next].map(([id, at]) => [id, athensDate(at)]))
          }
        />
      )}
    </div>
  );
}

// G1 Παραγωγές στη νέα εμφάνιση (prototype `screens/G1.tsx`): όψη ομάδας, ή κάρτες για τον Χρήστη πελάτη. Μία ανάγνωση όλων των Παραγωγών που βλέπει ο θεατής·
// οι προβολές και οι αριθμοί τους μετρώνται εδώ. Η βάση αποφασίζει ποιες Παραγωγές φαίνονται.
export async function SpacesProductions({ query: raw }: { query: RawQuery }) {
  const query = g1QueryOf(raw);
  const viewer = await getViewer();
  const caps = productionsCaps(viewer);
  if (!caps.canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τις Παραγωγές τις βλέπει όποιος «Βλέπει Παραγωγές».</p>
        </StateNotice>
      </div>
    );
  if (caps.isClient) return <ClientProductions viewer={viewer} query={query} />;
  const [productions, candidates, signals] = await Promise.all([
    listProductions({ state: null, internalOnly: false }),
    caps.canCreateInternal ? listOwnerCandidates() : null,
    loadSignals(viewer),
  ]);
  if (!productions.ok || (candidates !== null && !candidates.ok))
    return (
      <div data-spaces>
        <ErrorNotice what="οι Παραγωγές" />
      </div>
    );

  const isScoped = scopeOf(viewer) === "mine";
  const mode = parseMode(query.mode, scopeOf(viewer) === "all");
  // Άγνωστος Πελάτης (ή χωρίς ορατές Παραγωγές) = χωρίς φίλτρο, όπως το findClient του prototype.
  const ofTheClient = ofClient(productions.data, query.client);
  const clientName = query.client ? ofTheClient[0]?.client?.name : undefined;
  const all = clientName ? ofTheClient : productions.data;
  const views = visibleViews(costsCaps(viewer).canView);
  const wanted = parseView(query);
  const active = views.some((view) => view.id === wanted) ? wanted : "open";
  const shown = sortFor(
    active,
    all.filter((card) => matches(active, card, signals)),
  );
  const people = candidates?.ok ? candidates.data : [];

  return (
    <div data-spaces>
      {isScoped && (
        <p className="note">
          Με αφορά: Παραγωγές όπου είσαι Μέλος (Υπεύθυνος ή με ανάθεση σε
          εργασία, Παραδοτέο ή Συνεργείο).
        </p>
      )}
      {clientName && <ClientFilter name={clientName} view={active} />}
      <G1ModeSwitch
        active={mode}
        canSeeLoad={scopeOf(viewer) === "all"}
        clientId={clientName ? query.client : undefined}
      />
      {mode === "board" && (
        <G1BoardSection cards={all} canMove={scopeOf(viewer) !== undefined} />
      )}
      {mode === "load" && <G1WorkloadSection />}
      {mode === "list" && (
        <>
          <ViewTabs
            views={views}
            active={active}
            all={all}
            signals={signals}
            clientId={clientName ? query.client : undefined}
          />
          <G1Team
            rows={shown.map((card) => toRow(card, signals))}
            people={people}
            defaultOwnerId={defaultOwnerOf(viewer, people)}
            canCreate={caps.canCreateInternal}
            emptyText={isScoped ? EMPTY_SCOPED : EMPTY_TEXT}
          />
        </>
      )}
    </div>
  );
}
