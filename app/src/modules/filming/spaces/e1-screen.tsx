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
import { groupFilmings } from "./e1-groups";
import { E1Table } from "./e1-table";

import "./e1.css";

interface SpacesFilmingsProps {
  tab: FilmingTab;
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
export async function SpacesFilmings({ tab }: SpacesFilmingsProps) {
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
  const views = visibleViews(caps.canApprove);
  const [strip, ...results] = await Promise.all([
    getSpaceStrip(codesOfSpace(isClient ? "c-filming" : "production")),
    ...views.map((view) => listFilmings(view.id)),
  ]);
  const counts = new Map(
    views.map((view, index) => {
      const result = results[index];
      return [view.id, result.ok ? result.data.length : null] as const;
    }),
  );
  const current =
    results[views.findIndex((view) => view.id === tab)] ??
    (await listFilmings(tab));
  const nowMs = new Date().getTime();
  return (
    <div data-spaces>
      <Strip stats={strip.stats} now={strip.now} />
      {isScoped(viewer) && (
        <p className="note">
          «Με αφορά»: βλέπεις τα Γυρίσματα στα οποία συμμετέχεις.
        </p>
      )}
      {isClient && can(viewer, "c.book") && (
        <div className="toolbar">
          <Link className="button" data-primary="true" href={hrefOf("E5")}>
            Κλείσε νέο Γύρισμα
          </Link>
        </div>
      )}
      {caps.canBook && (
        <div className="toolbar">
          <Link className="button" data-primary="true" href={hrefOf("E4")}>
            Νέο Γύρισμα
          </Link>
        </div>
      )}
      <Views views={views} tab={tab} counts={counts} />
      {current.ok ? (
        <Groups rows={current.data} nowMs={nowMs} isClient={isClient} />
      ) : (
        <ErrorNotice what="τα Γυρίσματα" />
      )}
    </div>
  );
}
