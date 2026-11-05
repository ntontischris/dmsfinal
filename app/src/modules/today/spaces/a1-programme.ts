// «Το πρόγραμμα» (#241 Σ3): ως τις 18:00 (ώρα Ελλάδας) τα σημερινά Γυρίσματα, μετά τα αυριανά, με σειρά ώρας.
// Άδεια μέρα: το επόμενο Γύρισμα. Οι στιγμές είναι «ΕΕΕΕ-ΜΜ-ΗΗTΩΩ:ΛΛ» σε ώρα Ελλάδας (athensStamp).

import { athensStamp } from "./a1-adapter";
import type { CardRow } from "./a1-model";

export type ProgrammeDay = "today" | "tomorrow";

export interface Slot extends CardRow {
  date: string;
  time: string;
}

export interface Programme {
  day: ProgrammeDay;
  heading: string;
  slots: readonly Slot[];
  next: (Slot & { when: string }) | null;
}

const EVENING_HOUR = 18;

const WEEKDAYS_LONG = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
] as const;

export const weekdayOf = (date: string): string =>
  WEEKDAYS_LONG[new Date(`${date}T12:00Z`).getUTCDay()];

// «Πέμπτη 5/11».
const dayNameOf = (date: string): string =>
  `${weekdayOf(date)} ${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;

const nextDate = (date: string): string =>
  new Date(Date.parse(`${date}T12:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

const slotsOf = (rows: readonly CardRow[]): readonly Slot[] =>
  rows
    .flatMap((row) => {
      const time = row.at ? Date.parse(row.at) : Number.NaN;
      if (Number.isNaN(time)) return [];
      const stamp = athensStamp(new Date(time));
      return [{ ...row, date: stamp.slice(0, 10), time: stamp.slice(11, 16) }];
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

export function programmeOf(
  rows: readonly CardRow[],
  stamp: string,
): Programme {
  const today = stamp.slice(0, 10);
  const day: ProgrammeDay =
    Number(stamp.slice(11, 13)) < EVENING_HOUR ? "today" : "tomorrow";
  const date = day === "today" ? today : nextDate(today);
  const all = slotsOf(rows);
  const slots = all.filter((slot) => slot.date === date);
  const later = all.find((slot) => slot.date > date);
  return {
    day,
    heading: `${day === "today" ? "Σήμερα" : "Αύριο"}, ${dayNameOf(date)}`,
    slots,
    next:
      slots.length === 0 && later
        ? { ...later, when: `${dayNameOf(later.date)}, ${later.time}` }
        : null,
  };
}
