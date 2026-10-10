import { athensDate, athensTime } from "@/modules/filming";

import { addDays, daysBetween } from "./date-range";
import type { CalendarData } from "./types";
import type { LayerKey } from "./url-state";

// Το μοντέλο της οθόνης: για κάθε μέρα της περιόδου, η κατάστασή της και τα στοιχεία της, κατά επίπεδο.
// Καθαρές συναρτήσεις· τα links και οι ετικέτες μπαίνουν εδώ για να ελέγχονται με τεστ.

export type EntryKind = "filming" | "blocked" | "busy";

export interface CalendarEntry {
  key: string;
  kind: EntryKind;
  startsAt: string;
  time: string;
  title: string;
  detail: string | null;
  isPending: boolean;
  href: string | null;
}

export interface CalendarDay {
  date: string;
  status: string | null;
  holidayName: string | null;
  entries: CalendarEntry[];
}

interface PlacedEntry {
  layer: LayerKey;
  entry: CalendarEntry;
  days: readonly string[];
}

const ALL_DAY_LABEL = "όλη μέρα";
const HOUR_MS = 3_600_000;
const MAX_DAYS = 62;

// Οι μέρες (Ώρα Ελλάδας) που αγγίζει ένα διάστημα. Το τέλος είναι αποκλειστικό.
export function coveredDays(startsAt: string, endsAt: string): readonly string[] {
  const first = athensDate(startsAt);
  const last = athensDate(new Date(new Date(endsAt).getTime() - 1));
  const count = Math.min(daysBetween(first, last) + 1, MAX_DAYS);
  return Array.from({ length: Math.max(count, 1) }, (_, index) => addDays(first, index));
}

const timeSpan = (startsAt: string, endsAt: string): string =>
  `${athensTime(startsAt)}–${athensTime(endsAt)}`;

const filmingEnd = (startsAt: string, hours: number): string =>
  new Date(new Date(startsAt).getTime() + hours * HOUR_MS).toISOString();

function filmingPlaced(data: CalendarData): PlacedEntry[] {
  return data.filmings.map((filming) => ({
    layer: "filmings",
    days: [athensDate(filming.startsAt)],
    entry: {
      key: `filming-${filming.id}`,
      kind: "filming",
      startsAt: filming.startsAt,
      time: timeSpan(filming.startsAt, filmingEnd(filming.startsAt, filming.hours)),
      title: filming.title ?? "Γύρισμα",
      detail: null,
      isPending: filming.state === "pending",
      href: `/app/filming/${filming.id}`,
    },
  }));
}

function blockedPlaced(data: CalendarData): PlacedEntry[] {
  return data.blocked.map((block) => ({
    layer: "blocked",
    days: coveredDays(block.startsAt, block.endsAt),
    entry: {
      key: `blocked-${block.id}`,
      kind: "blocked",
      startsAt: block.startsAt,
      time: block.allDay ? ALL_DAY_LABEL : timeSpan(block.startsAt, block.endsAt),
      title: block.title ?? "Κλεισμένος χρόνος",
      detail: block.isMine ? null : block.userName,
      isPending: false,
      href: block.isMine || data.canBlockOthers ? `/app/calendar/blocked/${block.id}` : null,
    },
  }));
}

function busyPlaced(data: CalendarData): PlacedEntry[] {
  return data.busy.map((busy) => ({
    layer: "busy",
    days: coveredDays(busy.startsAt, busy.endsAt),
    entry: {
      key: `busy-${busy.userId}-${busy.startsAt}`,
      kind: "busy",
      startsAt: busy.startsAt,
      time: timeSpan(busy.startsAt, busy.endsAt),
      title: "Απασχολημένος",
      detail: busy.userName,
      isPending: false,
      href: null,
    },
  }));
}

// Τα στοιχεία κάθε μέρας, με τα ενεργά επίπεδα μόνο και ταξινομημένα ανά ώρα.
function entriesByDay(
  data: CalendarData,
  layers: readonly LayerKey[],
): Map<string, CalendarEntry[]> {
  const placed = [...filmingPlaced(data), ...blockedPlaced(data), ...busyPlaced(data)];
  const byDay = new Map<string, CalendarEntry[]>();
  for (const item of placed.filter((candidate) => layers.includes(candidate.layer))) {
    for (const day of item.days) byDay.set(day, [...(byDay.get(day) ?? []), item.entry]);
  }
  return new Map([...byDay].map(([day, entries]) => [day, sortByStart(entries)]));
}

const sortByStart = (entries: CalendarEntry[]): CalendarEntry[] =>
  [...entries].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.key.localeCompare(b.key));

// Οι μέρες της περιόδου, με κατάσταση (αν η βάση τη δίνει) και στοιχεία.
export function buildCalendarDays(
  data: CalendarData,
  dates: readonly string[],
  layers: readonly LayerKey[],
): CalendarDay[] {
  const statuses = new Map(data.days.map((day) => [day.day, day]));
  const entries = entriesByDay(data, layers);
  return dates.map((date) => ({
    date,
    status: statuses.get(date)?.status ?? null,
    holidayName: statuses.get(date)?.holidayName ?? null,
    entries: entries.get(date) ?? [],
  }));
}
