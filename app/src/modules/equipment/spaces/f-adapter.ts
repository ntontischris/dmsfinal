import { athensDate, athensTime, type FilmingRow } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";

import type { EquipmentReservation, HistoryLine } from "../types";
import { overlaps, type TimeWindow } from "./f-model";

// Πραγματικά δεδομένα → σχήματα των F2 (prototype `screens/f2-*.tsx`). Τρέχει στον server: οι ετικέτες φτάνουν έτοιμες στον browser.

const HOUR_MS = 3_600_000;
const ATHENS = "Europe/Athens";
const WEEKDAY_LONG = new Intl.DateTimeFormat("el-GR", {
  weekday: "long",
  timeZone: ATHENS,
});
const WEEKDAY_SHORT = new Intl.DateTimeFormat("el-GR", {
  weekday: "short",
  timeZone: ATHENS,
});

// Οι ανοιχτές καταστάσεις που έχει μια Δέσμευση (equipment_item_view: pending, scheduled).
const OPEN_STATE_LABELS: Readonly<Record<string, string>> = {
  pending: "Αναμένει έγκριση",
  scheduled: "Προγραμματισμένο",
};

export const endIso = (startsAt: string, hours: number): string =>
  new Date(Date.parse(startsAt) + hours * HOUR_MS).toISOString();

// «Παρασκευή 02/10», σε Ώρα Ελλάδας.
export const fmtDay = (iso: string): string => {
  const [, month, day] = athensDate(iso).split("-");
  return `${WEEKDAY_LONG.format(new Date(iso))} ${day}/${month}`;
};

// «Κυψέλη Καφέ · Παρασκευή 02/10 09:00–13:00»· χωρίς όνομα όταν ο Χρήστης δεν βλέπει το Γύρισμα.
export const filmingLabel = (
  startsAt: string,
  hours: number,
  name: string | null,
): string => {
  const when = `${fmtDay(startsAt)} ${athensTime(startsAt)}–${athensTime(endIso(startsAt, hours))}`;
  return name ? `${name} · ${when}` : when;
};

const nameOf = (row: FilmingRow): string =>
  row.client?.name ?? row.production.title;

export interface ReservationView extends TimeWindow {
  key: string;
  filmingId: string | null;
  href: string | null;
  label: string;
  weekday: string;
  day: string;
  stateLabel: string;
  conflict: boolean;
  isUpcoming: boolean;
}

export interface CandidateView extends TimeWindow {
  id: string;
  label: string;
}

export const reservationViewsOf = (
  reservations: readonly EquipmentReservation[],
  openFilmings: readonly FilmingRow[],
  now: Date,
): ReservationView[] => {
  const byId = new Map(openFilmings.map((row) => [row.id, row]));
  return reservations.map((row, index) => {
    const filming = row.filmingId ? byId.get(row.filmingId) : undefined;
    return {
      key: row.filmingId ?? `${index}-${row.startsAt}`,
      filmingId: row.filmingId,
      href: row.filmingId ? hrefOf("E3", { id: row.filmingId }) : null,
      label: filmingLabel(
        row.startsAt,
        row.hours,
        filming ? nameOf(filming) : null,
      ),
      weekday: WEEKDAY_SHORT.format(new Date(row.startsAt)),
      day: athensDate(row.startsAt).slice(8),
      stateLabel: OPEN_STATE_LABELS[row.state] ?? row.state,
      conflict: row.conflict,
      isUpcoming: Date.parse(row.startsAt) > now.getTime(),
      startsAt: row.startsAt,
      endsAt: endIso(row.startsAt, row.hours),
    };
  });
};

// Ζεύγη Δεσμεύσεων που επικαλύπτονται (η βάση τις σημαδεύει «σύγκρουση»· εδώ βρίσκεται με ποια).
export const conflictPairsOf = (
  views: readonly ReservationView[],
): { a: ReservationView; b: ReservationView }[] => {
  const marked = views.filter((view) => view.conflict);
  return marked.flatMap((a, index) =>
    marked
      .slice(index + 1)
      .filter((b) => overlaps(a, b))
      .map((b) => ({ a, b })),
  );
};

// Ανοιχτά Γυρίσματα όπου δεν είναι ήδη δεσμευμένο.
export const candidateViewsOf = (
  openFilmings: readonly FilmingRow[],
  reservations: readonly EquipmentReservation[],
): CandidateView[] => {
  const reserved = new Set(reservations.map((row) => row.filmingId));
  return openFilmings
    .filter((row) => !reserved.has(row.id))
    .map((row) => ({
      id: row.id,
      label: filmingLabel(row.startsAt, row.hours, nameOf(row)),
      startsAt: row.startsAt,
      endsAt: endIso(row.startsAt, row.hours),
    }));
};

export interface HistoryRow {
  key: string;
  when: string;
  text: string;
  by: string;
}

// Το Ιστορικό ως γραμμές: ημέρα (Ώρα Ελλάδας), τι έγινε, ποιος. Νεότερο πρώτο, όπως έρχεται.
export const historyRowsOf = (lines: readonly HistoryLine[]): HistoryRow[] =>
  lines.map((line, index) => {
    const [year, month, day] = athensDate(line.at).split("-");
    return {
      key: `${line.at}-${index}`,
      when: `${day}/${month}/${year}`,
      text: line.text,
      by: line.actor,
    };
  });
