// «Χρειάζονται εμένα» (οδηγός «Απαντώ σε Πελάτες», βήμα 1): μία γραμμή ανά Πελάτη με ό,τι θέλει εμένα — ανοιχτό Αίτημα,
// Συνομιλία που «Περιμένει απάντηση», @αναφορά σε μένα. Πιο παλιά πρώτα. Καθαρό αρχείο: το διαβάζει και ο browser.

import { threadHref } from "./helpers";
import type { InboxItem, QueueItem, RequestKind } from "./view-schema";

export type NeedKind = "request" | "reply" | "mention";

export interface NeedRow {
  // Η Συνομιλία του Πελάτη (ίδιο κλειδί με τη διαδρομή της).
  key: string;
  clientId: string;
  who: string;
  // Από πότε περιμένει (το πιο παλιό από όσα θέλουν εμένα).
  since: string;
  kind: NeedKind;
  // Η Συνομιλία· για Αίτημα, στο μήνυμά του.
  href: string;
  requestKind?: RequestKind;
}

// «Περιμένει απάντηση»· αν η βάση δεν δίνει ακόμα το πεδίο, ο Πελάτης έγραψε τελευταίος και δεν το διάβασα.
export const waitingSinceOf = (item: InboxItem): string | null =>
  item.waitingSince !== undefined
    ? item.waitingSince
    : item.unread > 0 && !item.lastInternal
      ? item.lastAt
      : null;

const mentionSinceOf = (item: InboxItem): string | null =>
  item.mentionSince ?? null;

const isOpenChatRequest = (
  item: QueueItem,
): item is QueueItem & { messageId: string; kind: RequestKind } =>
  item.messageId !== null && item.kind !== "change" && item.state === "open";

const oldestOf = (dates: readonly (string | null)[]): string | null =>
  dates
    .filter((date): date is string => date !== null)
    .reduce<string | null>(
      (oldest, date) => (oldest === null || date < oldest ? date : oldest),
      null,
    );

const requestRowOf = (
  request: QueueItem & { messageId: string; kind: RequestKind },
  item: InboxItem | undefined,
): NeedRow => ({
  key: threadHref(request.clientId),
  clientId: request.clientId,
  who: request.clientName,
  since:
    oldestOf([
      request.at,
      item ? waitingSinceOf(item) : null,
      item ? mentionSinceOf(item) : null,
    ]) ?? request.at,
  kind: "request",
  href: `${threadHref(request.clientId)}#m-${request.messageId}`,
  requestKind: request.kind,
});

const chatRowOf = (item: InboxItem): NeedRow | null => {
  const waiting = waitingSinceOf(item);
  const mention = mentionSinceOf(item);
  const since = oldestOf([waiting, mention]);
  if (since === null) return null;
  return {
    key: threadHref(item.clientId),
    clientId: item.clientId,
    who: item.clientName,
    since,
    kind: waiting !== null ? "reply" : "mention",
    href: threadHref(item.clientId),
  };
};

// Μία γραμμή ανά Πελάτη: το πιο παλιό ανοιχτό Αίτημά του, αλλιώς η Συνομιλία του. Πιο παλιά πρώτα.
export const needsMeOf = (
  inbox: readonly InboxItem[],
  openRequests: readonly QueueItem[],
): NeedRow[] => {
  const byClient = new Map(inbox.map((item) => [item.clientId, item]));
  const requests = [...openRequests]
    .filter(isOpenChatRequest)
    .sort((a, b) => a.at.localeCompare(b.at));
  const rows = new Map<string, NeedRow>();
  requests.forEach((request) => {
    if (!rows.has(request.clientId))
      rows.set(
        request.clientId,
        requestRowOf(request, byClient.get(request.clientId)),
      );
  });
  inbox.forEach((item) => {
    const row = rows.has(item.clientId) ? null : chatRowOf(item);
    if (row) rows.set(item.clientId, row);
  });
  return [...rows.values()].sort((a, b) => a.since.localeCompare(b.since));
};

const WAIT_UNITS = [
  { ms: 86_400_000, one: "μέρα", many: "μέρες" },
  { ms: 3_600_000, one: "ώρα", many: "ώρες" },
  { ms: 60_000, one: "λεπτό", many: "λεπτά" },
] as const;

// «περιμένει 3 ώρες»
export const waitLabel = (since: string, now: Date = new Date()): string => {
  const ms = Math.max(0, now.getTime() - new Date(since).getTime());
  const unit = WAIT_UNITS.find((item) => ms >= item.ms);
  if (!unit) return "περιμένει λίγο";
  const count = Math.floor(ms / unit.ms);
  return `περιμένει ${count} ${count === 1 ? unit.one : unit.many}`;
};

const KIND_LABEL: Readonly<Record<NeedKind, string>> = {
  request: "Ανοιχτό Αίτημα",
  reply: "Περιμένει απάντηση",
  mention: "Σε ανέφεραν",
};

export const needKindLabel = (kind: NeedKind): string => KIND_LABEL[kind];
