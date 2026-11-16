import Link from "next/link";

import { can, getViewer, isClientViewer, type Viewer } from "@/modules/access";
import { getSpaceStrip } from "@/modules/today";
import { hrefOf } from "@/spaces/data/screens";
import { codesOfSpace } from "@/spaces/data/spaces";
import { Panel } from "@/spaces/kit/panel";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { filmingCaps } from "../caps";
import { athensDate } from "../helpers-time";
import { listFilmings } from "../queries";
import type { FilmingRow, FilmingTab } from "../types";
import {
  e1FilmingOf,
  tabCountLabel,
  visibleViews,
  type E1View,
} from "./e1-adapter";
import { E1BoardView } from "./e1-board";
import { boardHref, type BoardParams } from "./e1-board-params";
import { groupFilmings } from "./e1-groups";
import { E1Table } from "./e1-table";

import "./e1.css";

interface SpacesFilmingsProps {
  tab: FilmingTab;
  board: BoardParams;
}

const isScoped = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" &&
  viewer.team?.permissions["filming.view"] === "mine";

function Views({
  views,
  tab,
  counts,
}: {
  views: readonly E1View[];
  tab: FilmingTab;
  counts: ReadonlyMap<FilmingTab, number | null>;
}) {
  return (
    <nav className="tabs" aria-label="Προβολή Γυρισμάτων">
      {views.map((item) => {
        const count = counts.get(item.id);
        return (
          <Link
            key={item.id}
            className="tab"
            aria-current={item.id === tab ? "page" : undefined}
            href={hrefOf("E1", {
              view: "list",
              tab: item.id === "open" ? undefined : item.id,
            })}
          >
            {item.label}
            {count !== null && count !== undefined
              ? ` (${tabCountLabel(count)})`
              : ""}
          </Link>
        );
      })}
    </nav>
  );
}

const CLIENT_EMPTY_TEXT =
  "Δεν έχεις Γυρίσματα σε αυτή την προβολή. Μπορείς να κλείσεις ένα.";

function Groups({
  rows,
  nowMs,
  isClient,
}: {
  rows: readonly FilmingRow[];
  nowMs: number;
  isClient: boolean;
}) {
  const groups = groupFilmings(rows.map(e1FilmingOf), nowMs, { isClient });
  const today = athensDate(new Date(nowMs));
  if (groups.length === 0)
    return (
      <StateNotice kind="empty" title="Κανένα Γύρισμα εδώ.">
        {isClient
          ? CLIENT_EMPTY_TEXT
          : "Δεν υπάρχει Γύρισμα σε αυτή την προβολή."}
      </StateNotice>
    );
  return groups.map((group) => (
    <div key={group.id} className="e1-group" data-attention={group.isAttention}>
      <Panel label={group.label} aside={group.filmings.length} isFlush>
        <E1Table
          filmings={group.filmings}
          nowMs={nowMs}
          today={today}
          nextId={group.nextId}
          isLate={group.isAttention}
          isClient={isClient}
        />
      </Panel>
    </div>
  ));
}

// E1 Γυρίσματα στη νέα εμφάνιση (prototype `screens/E1.tsx`): ομάδες «Θέλουν «έγινε»», επόμενα και παλιά ανά μήνα.
// Η βάση φιλτράρει ανά καρτέλα και αποφασίζει τι βλέπει ο Χρήστης. Ο Χρήστης πελάτη βλέπει τη δική του όψη (prototype `isClient`):
// τη λωρίδα του Χώρου «Γυρίσματα» πελάτη, χωρίς Συνεργείο· με την προβολή «Θέλουν «έγινε»» και τα σήματα της σημερινής σελίδας. Η κάρτα υπολοίπου του prototype λείπει
// (η λίστα της βάσης δεν δίνει υπόλοιπο Παροχής ανά Περίοδο).
function ViewToggle({ board }: { board: BoardParams }) {
  return (
    <nav className="e1b-toggle" aria-label="Όψη Γυρισμάτων">
      {(["board", "list"] as const).map((view) => (
        <Link
          key={view}
          href={boardHref(board, { view })}
          aria-current={board.view === view ? "page" : undefined}
        >
          {view === "board" ? "Πίνακας" : "Λίστα"}
        </Link>
      ))}
    </nav>
  );
}

async function ListView({
  tab,
  canApprove,
  isClient,
  nowMs,
}: {
  tab: FilmingTab;
  canApprove: boolean;
  isClient: boolean;
  nowMs: number;
}) {
  const views = visibleViews(canApprove);
  const results = await Promise.all(views.map((view) => listFilmings(view.id)));
  const counts = new Map(
    views.map((view, index) => {
      const result = results[index];
      return [view.id, result.ok ? result.data.length : null] as const;
    }),
  );
  const current =
    results[views.findIndex((view) => view.id === tab)] ??
    (await listFilmings(tab));
  return (
    <>
      <Views views={views} tab={tab} counts={counts} />
      {current.ok ? (
        <Groups rows={current.data} nowMs={nowMs} isClient={isClient} />
      ) : (
        <ErrorNotice what="τα Γυρίσματα" />
      )}
    </>
  );
}

// E1 Γυρίσματα στη νέα εμφάνιση. Προεπιλογή ο Πίνακας (τέσσερις στήλες, σύρσιμο, φίλτρα)· η «Λίστα» κρατά τις ομάδες
// «Θέλουν «έγινε»», επόμενα και παλιά ανά μήνα. Η βάση αποφασίζει τι βλέπει ο Χρήστης· ο Χρήστης πελάτη βλέπει τη δική του
// όψη, χωρίς Συνεργείο, και ο Πίνακάς του μόνο διαβάζεται.
export async function SpacesFilmings({ tab, board }: SpacesFilmingsProps) {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση στα Γυρίσματα">
          Τα Γυρίσματα τα βλέπει όποιος «Βλέπει Γυρίσματα».
        </StateNotice>
      </div>
    );
  const isClient = isClientViewer(viewer);
  const strip = await getSpaceStrip(
    codesOfSpace(isClient ? "c-filming" : "production"),
  );
  const nowMs = new Date().getTime();
  return (
    <div data-spaces>
      <Strip stats={strip.stats} now={strip.now} />
      {isScoped(viewer) && (
        <p className="note">
          «Με αφορά»: βλέπεις τα Γυρίσματα στα οποία συμμετέχεις.
        </p>
      )}
      <div className="toolbar">
        <ViewToggle board={board} />
        {isClient && can(viewer, "c.book") && (
          <Link className="button" data-primary="true" href={hrefOf("E5")}>
            Κλείσε νέο Γύρισμα
          </Link>
        )}
        {caps.canBook && (
          <Link className="button" data-primary="true" href={hrefOf("E4")}>
            Νέο Γύρισμα
          </Link>
        )}
      </div>
      {board.view === "board" ? (
        <E1BoardView
          params={board}
          caps={caps}
          isClient={isClient}
          viewerId={viewer.status === "signed-in" ? viewer.userId : null}
          nowMs={nowMs}
          today={athensDate(new Date(nowMs))}
        />
      ) : (
        <ListView
          tab={tab}
          canApprove={caps.canApprove}
          isClient={isClient}
          nowMs={nowMs}
        />
      )}
    </div>
  );
}
