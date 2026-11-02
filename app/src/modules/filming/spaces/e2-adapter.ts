// E2 (νέα εμφάνιση): η ουρά της βάσης (filming_queue_view) στις κάρτες του prototype. Καθαρές συναρτήσεις.

import { hrefOf } from "@/spaces/data/screens";

import { athensDate, athensTime, formatDateTime } from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";
import type { RescheduleRequestEntry } from "../booking-types";
import type { CancelRequestEntry, PendingEntry, ProvisionBalance } from "../types";
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
}

// «21/09 Δευ 10:00–13:00» σε ώρα Αθήνας.
export const whenOf = (startsAt: string, hours: number): string =>
  whenLabel(
    athensDate(startsAt),
    athensTime(startsAt),
    athensTime(new Date(Date.parse(startsAt) + hours * HOUR_MS).toISOString()),
  );

const balanceText = (provision: ProvisionBalance | null): string | null =>
  provision
    ? `${provision.kind.label}: ${provision.balance} από ${provision.given + provision.carried} διαθέσιμα μετά από αυτό το Γύρισμα`
    : null;

export const pendingItemOf = (entry: PendingEntry): PendingItem => ({
  id: entry.id,
  filmingHref: hrefOf("E3", { id: entry.id }),
  clientName: entry.client?.name ?? NO_CLIENT_LABEL,
  production: entry.production.title,
  when: whenOf(entry.startsAt, entry.hours),
  hours: entry.hours,
  waitingHours: Math.max(0, Math.round(entry.waitingHours)),
  isWaitingLong: entry.waitingLong,
  balance: balanceText(entry.provision),
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
  hoursLeft: Math.max(0, Math.round((Date.parse(entry.startsAt) - nowMs) / HOUR_MS)),
  burns: entry.willBurn,
});

export const rescheduleItemOf = (entry: RescheduleRequestEntry): RescheduleItem => ({
  id: entry.id,
  filmingHref: hrefOf("E3", { id: entry.id }),
  clientName: entry.client?.name ?? NO_CLIENT_LABEL,
  production: entry.production.title,
  when: whenOf(entry.startsAt, entry.hours),
  newWhen: whenOf(entry.newStartsAt, entry.newHours),
  requestedAt: formatDateTime(entry.requestedAt),
  slotProblem: entry.slotProblem,
});

// Παλαιότερη αναμονή πρώτα, όπως στο prototype.
export const pendingOldestFirst = (
  entries: readonly PendingEntry[],
): PendingEntry[] =>
  [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
