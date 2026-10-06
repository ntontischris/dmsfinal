import { MESSAGE_RULES, type Message } from "@/data/messages";
import {
  authorName,
  canSeeMessage,
  conversationsOf,
  mentionsOf,
  requestViewsOf,
  requestsOf,
  type RequestView,
} from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { fmtWhen } from "@/screens/j-message";

export type InboxTab = "conversations" | "requests" | "mentions";

export const TABS: readonly InboxTab[] = [
  "conversations",
  "requests",
  "mentions",
];

export const VIEW_KEYS: Readonly<Record<RequestView, string>> = {
  "για μένα": "mine",
  "όλα τα ανοιχτά": "open",
  "χωρίς υπεύθυνο": "unassigned",
  κλεισμένα: "closed",
};

export const parseTab = (value: string | undefined): InboxTab =>
  TABS.find((t) => t === value) ?? "conversations";

export const parseView = (
  role: RoleId,
  value: string | undefined,
): RequestView => {
  const views = requestViewsOf(role);
  return views.find((v) => VIEW_KEYS[v] === value) ?? views[0];
};

export const truncate = (text: string, max = 120): string =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

export const previewOf = (message: Message): string => {
  if (message.deletedAt) return "Το Μήνυμα διαγράφηκε";
  const prefix = message.isInternal ? "Εσωτερικό: " : "";
  return `${prefix}${authorName(message)}: ${truncate(message.text, 90)}`;
};

export const whenOf = (message: Message): string => fmtWhen(message.at);

export const staleLabel = `ειδοποιήθηκε ο υπεύθυνος (${MESSAGE_RULES.requestOpenDays} μέρες)`;

export const visibleMentions = (role: RoleId): readonly Message[] =>
  mentionsOf(role).filter((m) => canSeeMessage(role, m));

export interface InboxCounts {
  unread: number;
  requests: number;
  mentions: number;
}

export const countsOf = (role: RoleId, isEmpty: boolean): InboxCounts =>
  isEmpty
    ? { unread: 0, requests: 0, mentions: 0 }
    : {
        unread: conversationsOf(role).reduce((sum, row) => sum + row.unread, 0),
        requests: requestsOf(role, "για μένα").length,
        mentions: visibleMentions(role).length,
      };
