import { z } from "zod";

import { CALENDAR_VIEWS, type CalendarView } from "./date-range";

// Η κατάσταση του Ημερολογίου στο URL: προβολή, μέρα αγκύρωσης και ενεργά επίπεδα. Ό,τι δεν είναι σωστό παίρνει προεπιλογή.

export const LAYER_KEYS = ["filmings", "blocked", "busy"] as const;
export type LayerKey = (typeof LAYER_KEYS)[number];

export interface CalendarParams {
  view: CalendarView;
  date: string;
  layers: readonly LayerKey[];
}

type RawQuery = Readonly<Record<string, string | string[] | undefined>>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const VIEW_IDS = CALENDAR_VIEWS.map((view) => view.id) as [CalendarView, ...CalendarView[]];

const isRealDay = (value: string): boolean =>
  ISO_DAY.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

// Μόνο τα επίπεδα που γράφονται ξανά· χωρίς παράμετρο, όλα ενεργά.
const parseLayers = (value: string | undefined): readonly LayerKey[] => {
  if (value === undefined) return LAYER_KEYS;
  const requested = value.split(",");
  return LAYER_KEYS.filter((key) => requested.includes(key));
};

export function parseCalendarParams(query: RawQuery, today: string): CalendarParams {
  const parsedView = z.enum(VIEW_IDS).safeParse(first(query.view));
  const rawDate = first(query.date);
  return {
    view: parsedView.success ? parsedView.data : "week",
    date: rawDate !== undefined && isRealDay(rawDate) ? rawDate : today,
    layers: parseLayers(first(query.layers)),
  };
}

// Ο σύνδεσμος της κατάστασης, με μερική αλλαγή (π.χ. άλλη προβολή ή άλλη μέρα).
export function calendarHref(params: CalendarParams, patch: Partial<CalendarParams> = {}): string {
  const next = { ...params, ...patch };
  const query = new URLSearchParams({
    view: next.view,
    date: next.date,
    layers: next.layers.join(","),
  });
  return `/app/calendar?${query.toString()}`;
}
