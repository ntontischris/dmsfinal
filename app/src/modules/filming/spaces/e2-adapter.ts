// E2 (νέα εμφάνιση): η ουρά της βάσης (filming_queue_view) στις κάρτες του prototype. Καθαρές συναρτήσεις.

import { hrefOf } from "@/spaces/data/screens";

import { athensDate, athensTime, formatDateTime } from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";
import type { RescheduleRequestEntry } from "../booking-types";
import type {
  CancelRequestEntry,
  PendingEntry,
  ProvisionBalance,
} from "../types";
import { whenLabel } from "./e1-format";

const HOUR_MS = 3_600_000;

export interface PendingItem {
  id: string;
  filmingHref: string;
  clientName: string;
  production: string;
  when: string;
  hours: number;
  waitingHours: number;
  isWaitingLong: boolean;
  balance: string | null;
  // Η μέρα του Γυρίσματος έχει περάσει: η έγκριση δεν έχει νόημα χωρίς νέα ώρα.
  isPast: boolean;
}

export interface CancelItem {
  id: string;
  filmingHref: string;
  clientName: string;
  production: string;
  when: string;
  requestedAt: string;
  reason: string;
  hoursLeft: number;
  burns: boolean;
}

export interface RescheduleItem {
  id: string;
  filmingHref: string;
  clientName: string;
  production: string;
  when: string;
  newWhen: string;
  requestedAt: string;
  slotProblem: string | null;
  // Η ώρα που ζητά έχει ήδη περάσει.
  isPast: boolean;
}

// Η ώρα έχει ήδη περάσει τη στιγμή της ανάγνωσης.
export const isPastStart = (startsAt: string, nowMs: number): boolean =>
  Date.parse(startsAt) < nowMs;

// «21/09 Δευ 10:00–13:00» σε ώρα Αθήνας.
export const whenOf = (startsAt: string, hours: number): string =>
  whenLabel(
    athensDate(startsAt),
    athensTime(startsAt),
    athensTime(new Date(Date.parse(startsAt) + hours * HOUR_MS).toISOString()),
  );

// «Γύρισμα: μένει 1 από 2 μετά από αυτό το Γύρισμα» ή, όταν ξεπερνά την Παροχή,
// «Γύρισμα: 3 από 2 μαζί με αυτό το Γύρισμα — 1 πάνω από την Παροχή».
export const balanceText = (
  provision: ProvisionBalance | null,
): string | null => {
  if (!provision) return null;
  const { kind, given, carried, used, reserved, balance } = provision;
  const total = given + carried;
  if (balance < 0)
    return `${kind.label}: ${used + reserved} από ${total} μαζί με αυτό το Γύρισμα — ${-balance} πάνω από την Παροχή`;
  const left = balance === 1 ? "μένει 1" : `μένουν ${balance}`;
  return `${kind.label}: ${left} από ${total} μετά από αυτό το Γύρισμα`;
};

export const pendingItemOf = (
  entry: PendingEntry,
  nowMs: number,
): PendingItem => ({
  id: entry.id,
  filmingHref: hrefOf("E3", { id: entry.id }),
  clientName: entry.client?.name ?? NO_CLIENT_LABEL,
  production: entry.production.title,
  when: whenOf(entry.startsAt, entry.hours),
  hours: entry.hours,
  waitingHours: Math.max(0, Math.round(entry.waitingHours)),
  isWaitingLong: entry.waitingLong,
  balance: balanceText(entry.provision),
  isPast: isPastStart(entry.startsAt, nowMs),
});

export const cancelItemOf = (
  entry: CancelRequestEntry,
  nowMs: number,
): CancelItem => ({
  id: entry.id,
  filmingHref: hrefOf("E3", { id: entry.id }),
  clientName: entry.client?.name ?? NO_CLIENT_LABEL,
  production: entry.production.title,
  when: whenOf(entry.startsAt, entry.hours),
  requestedAt: formatDateTime(entry.requestedAt),
  reason: entry.reason,
  hoursLeft: Math.max(
    0,
    Math.round((Date.parse(entry.startsAt) - nowMs) / HOUR_MS),
  ),
  burns: entry.willBurn,
});

export const rescheduleItemOf = (
  entry: RescheduleRequestEntry,
  nowMs: number,
): RescheduleItem => ({
  id: entry.id,
  filmingHref: hrefOf("E3", { id: entry.id }),
  clientName: entry.client?.name ?? NO_CLIENT_LABEL,
  production: entry.production.title,
  when: whenOf(entry.startsAt, entry.hours),
  newWhen: whenOf(entry.newStartsAt, entry.newHours),
  requestedAt: formatDateTime(entry.requestedAt),
  slotProblem: entry.slotProblem,
  isPast: isPastStart(entry.newStartsAt, nowMs),
});

// Παλαιότερη αναμονή πρώτα, όπως στο prototype.
export const pendingOldestFirst = (
  entries: readonly PendingEntry[],
): PendingEntry[] =>
  [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
