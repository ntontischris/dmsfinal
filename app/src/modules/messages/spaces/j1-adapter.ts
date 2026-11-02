// J1 (νέα εμφάνιση): τα πραγματικά Εισερχόμενα (messages_inbox, messages_mentions, messages_requests_view) στις γραμμές του
// prototype. Καθαρές συναρτήσεις· τα κείμενα και οι σύνδεσμοι είναι αυτοί της σημερινής οθόνης.

import { formatWhen, previewLine, threadHref, truncate } from "../helpers";
import { queueItemHref, resultLink } from "../request-helpers";
import {
  REQUEST_KIND_LABELS,
  REQUEST_STATE_LABELS,
  daysOpenText,
} from "../request-labels";
import type { InboxItem, MentionItem, QueueItem } from "../view-schema";

export interface J1Conversation {
  id: string;
  name: string;
  href: string;
  preview: string;
  when: string;
  unread: number;
  // Ανοιχτά Αιτήματα του Πελάτη που βλέπει ο Χρήστης· null όταν δεν φόρτωσαν.
  openRequests: number | null;
  isPartial: boolean;
}

const openByClient = (open: readonly QueueItem[]): Map<string, number> =>
  open.reduce(
    (counts, item) =>
      item.state === "open"
        ? counts.set(item.clientId, (counts.get(item.clientId) ?? 0) + 1)
        : counts,
    new Map<string, number>(),
  );

export const j1ConversationsOf = (
  items: readonly InboxItem[],
  open: readonly QueueItem[] | null,
  now: Date = new Date(),
): J1Conversation[] => {
  const counts = open === null ? null : openByClient(open);
  return items.map((item) => ({
    id: item.clientId,
    name: item.clientName,
    href: threadHref(item.clientId),
    preview: previewLine(item),
    when: formatWhen(item.lastAt, now),
    unread: item.unread,
    openRequests: counts === null ? null : (counts.get(item.clientId) ?? 0),
    isPartial: item.partial,
  }));
};

export interface J1Mention {
  id: string;
  clientName: string;
  text: string;
  when: string;
  href: string;
}

const MENTION_LIMIT = 240;

export const j1MentionsOf = (
  items: readonly MentionItem[],
  now: Date = new Date(),
): J1Mention[] =>
  items.map((item) => ({
    id: item.messageId,
    clientName: item.clientName,
    text: `${item.authorName ? `${item.authorName}: ` : ""}${truncate(item.body, MENTION_LIMIT)}`,
    when: formatWhen(item.at, now),
    href: `${threadHref(item.clientId)}#m-${item.messageId}`,
  }));

export interface J1Closing {
  isDone: boolean;
  line: string;
  isAutomatic: boolean;
  link: string | null;
  result: { href: string; label: string } | null;
  comment: string | null;
  reply: string | null;
}

export interface J1Request {
  key: string;
  kind: string;
  clientName: string;
  productionTitle: string | null;
  text: string;
  // «Υπεύθυνος: … · ανοιχτό N μέρες» (το δεύτερο μόνο για ανοιχτά).
  owner: string;
  state: string;
  isOpen: boolean;
  isStale: boolean;
  href: string;
  closing: J1Closing | null;
}

const TEXT_LIMIT = 120;
const NO_ASSIGNEE = "Χωρίς υπεύθυνο";

const closingOf = (item: QueueItem, now: Date): J1Closing | null => {
  if (item.closed === null || item.state === "open") return null;
  const { closed } = item;
  const parts = [
    REQUEST_STATE_LABELS[item.state],
    closed.byName,
    closed.at === null ? null : formatWhen(closed.at, now),
  ].filter((part): part is string => part !== null);
  return {
    isDone: item.state === "done",
    line: parts.join(" · "),
    isAutomatic: closed.automatic,
    link: closed.link,
    result: resultLink(closed.resultKind, closed.resultId),
    comment:
      closed.comment === null ? null : truncate(closed.comment, TEXT_LIMIT),
    reply: closed.reply === null ? null : truncate(closed.reply, TEXT_LIMIT),
  };
};

const ownerOf = (item: QueueItem): string => {
  const who = `Υπεύθυνος: ${item.assigneeName ?? NO_ASSIGNEE}`;
  return item.state === "open" && item.daysOpen !== null
    ? `${who} · ${daysOpenText(item.daysOpen)}`
    : who;
};

export const j1RequestsOf = (
  items: readonly QueueItem[],
  now: Date = new Date(),
): J1Request[] =>
  items.map((item) => ({
    key: `${item.messageId ?? item.deliverableId}-${item.at}`,
    kind: REQUEST_KIND_LABELS[item.kind],
    clientName: item.clientName,
    productionTitle: item.productionTitle,
    text: truncate(item.text, TEXT_LIMIT),
    owner: ownerOf(item),
    state: REQUEST_STATE_LABELS[item.state],
    isOpen: item.state === "open",
    isStale: item.stale,
    href: queueItemHref(item),
    closing: closingOf(item, now),
  }));

// Οι ετικέτες των καρτελών, όπως στο prototype: «Συνομιλίες (N)» κ.λπ. Χωρίς αριθμό όταν δεν φόρτωσε.
export const tabLabelOf = (name: string, count: number | null): string =>
  count === null ? name : `${name} (${count})`;
