import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice } from "@/spaces/screens/shared";

import type { FilmingCaps, NamedRef } from "../types";
import { listCrewCandidates, listFilmings } from "../queries";
import { e1FilmingOf } from "./e1-adapter";
import { boardOf, filterBoard, type BoardCaps } from "./e1-board-model";
import { E1Board } from "./e1-board-dnd";
import {
  boardFilterGroups,
  boardFiltersOf,
  boardHref,
  rangeOf,
  type BoardParams,
} from "./e1-board-params";
import type { E1Filming } from "./e1-groups";

import "./e1-board.css";

// Η όψη «Πίνακας» της E1: ανοιχτά και κλειστά Γυρίσματα σε τέσσερις στήλες, με τα φίλτρα σε κάρτες από πάνω.

interface BoardViewProps {
  params: BoardParams;
  caps: FilmingCaps;
  isClient: boolean;
  viewerId: string | null;
  nowMs: number;
  today: string;
}

const NO_CAPS: BoardCaps = {
  canApprove: false,
  canBook: false,
  canCrew: false,
};

const clientsOf = (filmings: readonly E1Filming[]): readonly NamedRef[] =>
  [
    ...new Map(
      filmings.flatMap(({ clientId, clientName }) =>
        clientId && clientName
          ? [[clientId, { id: clientId, name: clientName }] as const]
          : [],
      ),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "el"));

async function crewOf(
  caps: FilmingCaps,
  isClient: boolean,
): Promise<readonly NamedRef[] | null> {
  if (isClient) return null;
  if (!caps.canCrew) return [];
  const result = await listCrewCandidates();
  return result.ok ? result.data : [];
}

function RangeForm({ params, today }: { params: BoardParams; today: string }) {
  const range = rangeOf(params, today);
  const keep = { client: params.client, crew: params.crew, care: params.care };
  return (
    <form className="e1b-range" method="get" aria-label="Περίοδος από–έως">
      {Object.entries(keep).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <input type="hidden" name="period" value="range" />
      <label>
        Από
        <input
          className="input"
          type="date"
          name="from"
          defaultValue={range.from}
        />
      </label>
      <label>
        Έως
        <input
          className="input"
          type="date"
          name="to"
          defaultValue={range.to}
        />
      </label>
      <button type="submit" className="button">
        Εφαρμογή
      </button>
    </form>
  );
}

export async function E1BoardView({
  params,
  caps,
  isClient,
  viewerId,
  nowMs,
  today,
}: BoardViewProps) {
  const [open, closed, crew] = await Promise.all([
    listFilmings("open"),
    listFilmings("closed"),
    crewOf(caps, isClient),
  ]);
  if (!open.ok || !closed.ok) return <ErrorNotice what="τα Γυρίσματα" />;
  const filmings = [...open.data, ...closed.data].map(e1FilmingOf);
  const shown = filterBoard(filmings, boardFiltersOf(params, today), {
    nowMs,
    today,
  });
  const boardCaps = isClient ? NO_CAPS : caps;
  return (
    <>
      <FilterBar
        name="e1-board"
        filters={boardFilterGroups(params, {
          clients: clientsOf(filmings),
          crew,
          viewerId,
        })}
        clearHref={boardHref(params, {
          client: undefined,
          crew: undefined,
          period: "all",
          care: undefined,
        })}
      />
      {params.period === "range" && <RangeForm params={params} today={today} />}
      <E1Board
        columns={boardOf(shown, nowMs)}
        nowMs={nowMs}
        caps={boardCaps}
        isClient={isClient}
        closedHref={hrefOf("E1", { view: "list", tab: "closed" })}
      />
    </>
  );
}
