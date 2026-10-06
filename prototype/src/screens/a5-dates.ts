import { CALENDAR_TODAY, type CalendarLayers } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import {
  screenHref,
  type ScreenQuery,
  type ScreenState,
} from "@/screens/shared";

export type A5View = "week" | "month" | "list";
export type LayerKey = "filmings" | "blocked" | "deadlines" | "team";

export const A5_VIEWS: readonly { id: A5View; label: string }[] = [
  { id: "week", label: "Εβδομάδα" },
  { id: "month", label: "Μήνας" },
  { id: "list", label: "Λίστα" },
];

export const LIST_DAYS = 30;
const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKDAYS = [
  "Δευ",
  "Τρι",
  "Τετ",
  "Πέμ",
  "Παρ",
  "Σάβ",
  "Κυρ",
] as const;
const WEEKDAYS_LONG = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
] as const;
const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

const toDate = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string =>
  toIso(new Date(toDate(iso).getTime() + days * DAY_MS));

export const mondayOf = (iso: string): string =>
  addDays(iso, -((toDate(iso).getUTCDay() + 6) % 7));

export const rangeDays = (from: string, count: number): readonly string[] =>
  Array.from({ length: count }, (_, index) => addDays(from, index));

const monthFirst = (iso: string): string => `${iso.slice(0, 7)}-01`;

const monthLast = (iso: string): string => {
  const next = toDate(monthFirst(iso));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return addDays(toIso(next), -1);
};

export const monthGrid = (iso: string): readonly string[] => {
  const start = mondayOf(monthFirst(iso));
  const end = addDays(mondayOf(monthLast(iso)), 6);
  const count = (toDate(end).getTime() - toDate(start).getTime()) / DAY_MS + 1;
  return rangeDays(start, count);
};

export const isSameMonth = (a: string, b: string): boolean =>
  a.slice(0, 7) === b.slice(0, 7);

export const rangeOf = (
  view: A5View,
  d: string,
): { from: string; to: string } => {
  if (view === "week") {
    const from = mondayOf(d);
    return { from, to: addDays(from, 6) };
  }
  if (view === "month") {
    const grid = monthGrid(d);
    return { from: grid[0], to: grid[grid.length - 1] };
  }
  return { from: d, to: addDays(d, LIST_DAYS - 1) };
};

const shiftMonth = (iso: string, direction: number): string => {
  const shifted = toDate(monthFirst(iso));
  shifted.setUTCMonth(shifted.getUTCMonth() + direction);
  const target = toIso(shifted);
  const day = Math.min(
    Number(iso.slice(8)),
    Number(monthLast(target).slice(8)),
  );
  return `${target.slice(0, 8)}${String(day).padStart(2, "0")}`;
};

export const shiftAnchor = (
  view: A5View,
  d: string,
  direction: 1 | -1,
): string => {
  if (view === "week") return addDays(d, 7 * direction);
  if (view === "month") return shiftMonth(d, direction);
  return addDays(d, LIST_DAYS * direction);
};

export const fmtShort = (iso: string): string =>
  `${iso.slice(8)}/${iso.slice(5, 7)}`;

export const fmtLong = (iso: string): string =>
  `${WEEKDAYS_LONG[toDate(iso).getUTCDay()]} ${fmtShort(iso)}`;

export const fmtStamp = (stamp: string): string =>
  `${fmtShort(stamp.slice(0, 10))} ${stamp.slice(11, 16)}`;

export const titleOf = (view: A5View, d: string): string => {
  if (view === "month") {
    return `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
  }
  const { from, to } = rangeOf(view, d);
  return `${fmtShort(from)} – ${fmtShort(to)}/${to.slice(0, 4)}`;
};

export const dayNumber = (iso: string): number => Number(iso.slice(8));

export interface A5Params {
  view: A5View;
  d: string;
  person?: string;
  hide: readonly LayerKey[];
  google?: "down";
  state: ScreenState;
}

const LAYER_KEYS: readonly LayerKey[] = [
  "filmings",
  "blocked",
  "deadlines",
  "team",
];

export const parseParams = (
  query: ScreenQuery,
  state: ScreenState,
): A5Params => ({
  view: A5_VIEWS.find((v) => v.id === query.view)?.id ?? "week",
  d: query.d && ISO.test(query.d) ? query.d : CALENDAR_TODAY,
  person: query.person || undefined,
  hide: LAYER_KEYS.filter((key) => (query.hide ?? "").split(",").includes(key)),
  google: query.google === "down" ? "down" : undefined,
  state,
});

export const layersOf = (hide: readonly LayerKey[]): CalendarLayers => ({
  filmings: !hide.includes("filmings"),
  blocked: !hide.includes("blocked"),
  deadlines: !hide.includes("deadlines"),
  team: !hide.includes("team"),
});

export const paramsQuery = (
  params: A5Params,
): Record<string, string | undefined> => ({
  view: params.view === "week" ? undefined : params.view,
  d: params.d === CALENDAR_TODAY ? undefined : params.d,
  person: params.person,
  hide: params.hide.length > 0 ? params.hide.join(",") : undefined,
  google: params.google,
  state: params.state === "normal" ? undefined : params.state,
});

export const a5Href = (
  role: RoleId,
  params: A5Params,
  patch: Partial<A5Params> = {},
): string => screenHref(role, "A5", paramsQuery({ ...params, ...patch }));
