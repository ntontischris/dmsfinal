// Οι κάρτες-κάδρα της Σήμερα (ίδια μορφή με τα «Χρήματα»): καθαρές συναρτήσεις για αρχικά, ετικέτα και επιλογή ομάδας.

import { athensStamp } from "./a1-adapter";
import { daysWord } from "./a1-facts";
import type { ListGroup } from "./a1-list";
import type { CardRow } from "./a1-model";

const DAY_MS = 86_400_000;
const MAX_FACES = 3;

// Το πρώτο μέρος της ετικέτας (πριν από «—», «·» ή «•»)· δύο λέξεις → δύο γράμματα, μόνο λέξεις με γράμματα.
export const initialsOf = (label: string): string =>
  (label.split(/\s[—·•]\s/)[0] ?? "")
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const stampOf = (iso: string): string | null => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : athensStamp(new Date(time));
};

const daysBetween = (from: string, to: string): number =>
  Math.round(
    (Date.parse(`${to}T12:00Z`) - Date.parse(`${from}T12:00Z`)) / DAY_MS,
  );

const waitingTagOf = (since: string, today: string): string | null => {
  const stamp = stampOf(since);
  if (!stamp) return null;
  const days = Math.max(0, daysBetween(stamp.slice(0, 10), today));
  return days === 0 ? "σήμερα" : daysWord(days);
};

const atTagOf = (at: string, today: string): string | null => {
  const stamp = stampOf(at);
  if (!stamp) return null;
  const day = stamp.slice(0, 10);
  const time = stamp.slice(11, 16);
  const offset = daysBetween(today, day);
  if (offset === 0) return `σήμερα ${time}`;
  if (offset === 1) return `αύριο ${time}`;
  return `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
};

// Η ετικέτα της γραμμής: πόσο περιμένει, αλλιώς πότε είναι· χωρίς ώρα, τίποτα.
export const lineTagOf = (row: CardRow, today: string): string | null => {
  if (row.waitingSince) return waitingTagOf(row.waitingSince, today);
  return row.at ? atTagOf(row.at, today) : null;
};

// Τα πρόσωπα της κάρτας: έως τρία διαφορετικά αρχικά, με τη σειρά των γραμμών.
export const facesOf = (group: ListGroup): readonly string[] =>
  [
    ...new Set(
      group.lines.map((line) => initialsOf(line.row.label)).filter(Boolean),
    ),
  ].slice(0, MAX_FACES);

export const isUrgentGroup = (group: ListGroup): boolean =>
  group.lines.some((line) => line.row.isUrgent);

// Η ανοιχτή κάρτα: όποια ζητήθηκε (?g=), αλλιώς η πρώτη με επείγον, αλλιώς η πρώτη.
export const selectedGroupOf = (
  groups: readonly ListGroup[],
  requested: string | undefined,
): ListGroup | null =>
  groups.find((group) => group.id === requested) ??
  groups.find(isUrgentGroup) ??
  groups[0] ??
  null;
