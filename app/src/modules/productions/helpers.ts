import type { Tone } from "@/components/ui/badge";

import { EVENT_LABELS, MONTH_NAMES, UNKNOWN_ACTOR_LABEL } from "./labels";
import type {
  HistoryLine,
  OwnerCandidate,
  PeriodBalance,
  ProductionHistoryEntry,
  ProductionMember,
  ProductionState,
  ProductionTab,
} from "./types";

// Καθαρές συναρτήσεις του module: σήματα, μορφοποίηση, υπόλοιπα και κείμενα του Ιστορικού.
// Καμία είσοδος/έξοδος· η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

export const stateTone = (state: ProductionState): Tone | undefined =>
  state === "delivered" ? "ok" : undefined;

// Η καρτέλα ζητά κατάσταση από τη βάση· «Όλες» δεν φιλτράρει.
export const tabState = (tab: ProductionTab): ProductionState | null =>
  tab === "all" ? null : tab;

export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

// «Οκτώβριος 2026» από την ημερομηνία έναρξης της Περιόδου (ημερολογιακός μήνας, Π1).
export const periodLabel = (starts: string): string => {
  const [year, month] = starts.split("-");
  return `${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
};

export interface BalanceRow extends PeriodBalance {
  isEmpty: boolean; // τίποτα δεν δόθηκε ή μεταφέρθηκε: η γραμμή μπαίνει σε σίγαση
}

// Μία γραμμή ανά είδος Παροχής της Περιόδου. Μετρά πλήθος, όχι ποσά.
export const balanceRows = (balances: readonly PeriodBalance[]): BalanceRow[] =>
  balances.map((balance) => ({
    ...balance,
    isEmpty:
      balance.given === 0 &&
      balance.carried === 0 &&
      balance.used === 0 &&
      balance.reserved === 0,
  }));

// Οι υποψήφιοι Υπεύθυνοι μιας Παραγωγής: όσοι δεν είναι ήδη Υπεύθυνος.
export const ownerChoices = (
  candidates: readonly OwnerCandidate[],
  currentOwnerId: string | null,
): OwnerCandidate[] =>
  candidates.filter((candidate) => candidate.id !== currentOwnerId);

// Οι υποψήφιοι Μέλη: όσοι δεν είναι ήδη Υπεύθυνος ή Μέλος.
export const memberChoices = (
  candidates: readonly OwnerCandidate[],
  ownerId: string | null,
  members: readonly ProductionMember[],
): OwnerCandidate[] => {
  const taken = new Set([ownerId, ...members.map((member) => member.userId)]);
  return candidates.filter((candidate) => !taken.has(candidate.id));
};

const actorOf = (entry: ProductionHistoryEntry): string =>
  entry.actorName ?? UNKNOWN_ACTOR_LABEL;

const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

// Η παράδοση γράφει το σχόλιό της· οι άλλες μεταβάσεις γράφουν λόγο.
const detailOf = (entry: ProductionHistoryEntry): string => {
  const note = textOf(entry.after?.note);
  if (note !== "") return entry.event === "delivered" ? `: ${note}` : `. Λόγος: ${note}`;
  const reason = textOf(entry.after?.reason);
  return reason !== "" ? `. Λόγος: ${reason}` : "";
};

const eventText = (entry: ProductionHistoryEntry): string => {
  const label = EVENT_LABELS[entry.event ?? ""] ?? entry.event ?? "—";
  return `${label}${detailOf(entry)}`;
};

// Μία γραμμή για κάθε γεγονός του Ίχνους. Οι εγγραφές insert/update δεν μπαίνουν: τα γεγονότα τις καλύπτουν.
export const historyLines = (
  entries: readonly ProductionHistoryEntry[],
): HistoryLine[] =>
  entries.flatMap((entry) =>
    entry.action === "event"
      ? [{ at: entry.at, actor: actorOf(entry), text: eventText(entry) }]
      : [],
  );
