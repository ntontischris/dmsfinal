// L2 (νέα εμφάνιση): οι πραγματικές Συζητήσεις του Βοηθού (assistant_conversations_list / _get) στις γραμμές, στις
// καρτέλες και στις φούσκες ερώτησης-απάντησης του prototype (`screens/L2.tsx`, `l2-detail.tsx`). Καθαρές συναρτήσεις.

import { fmtDate } from "@/spaces/screens/shared";

import {
  AUDIENCE_LABEL,
  conversationHref,
  CONVERSATIONS_PATH,
  listHref,
  whoText,
} from "../assistant-helpers";
import type {
  ConversationAudience,
  ConversationList,
  ConversationMessage,
  ConversationRow,
  MessageSource,
} from "../assistant-view-schema";
import { editHref } from "../helpers";

const ATHENS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Athens",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// «03/11/2026 14:05» στην ώρα της Αθήνας (το fmtWhen του prototype).
export const fmtWhen = (iso: string): string => {
  const parts = Object.fromEntries(
    ATHENS.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${fmtDate(`${parts.year}-${parts.month}-${parts.day}`)} ${parts.hour}:${parts.minute}`;
};

export interface L2Tab {
  label: string;
  href: string;
  isCurrent: boolean;
}

const TABS: readonly { value: ConversationAudience | null; label: string }[] = [
  { value: null, label: "Όλες" },
  { value: "public", label: "Δημόσιες" },
  { value: "client", label: "Πελατών" },
  { value: "team", label: "Ομάδας" },
];

export const l2Tabs = (
  list: ConversationList,
  audience: ConversationAudience | null,
): L2Tab[] =>
  TABS.map((tab) => ({
    label: `${tab.label} (${tab.value === null ? list.counts.all : list.counts[tab.value]})`,
    href: listHref(CONVERSATIONS_PATH, { tab: tab.value }),
    isCurrent: tab.value === audience,
  }));

export interface L2Row {
  id: string;
  href: string;
  who: string;
  firstQuestion: string | null;
  when: string;
  counts: string;
  kind: string;
}

export const l2RowOf = (row: ConversationRow): L2Row => ({
  id: row.id,
  href: conversationHref(row.id),
  who: whoText(row.audience, row.who, row.clientName),
  firstQuestion: row.firstQuestion,
  when: `${row.language} · ${fmtWhen(row.lastMessageAt)}`,
  counts: `Ερωτήσεις ${row.questionCount} · Αναπάντητες ${row.noSourceCount}`,
  kind: AUDIENCE_LABEL[row.audience],
});

export interface L2Source {
  key: string;
  label: string;
  isGone: boolean;
  // Μόνο τα στοιχεία της Γνώσης ανοίγουν (στον επεξεργαστή τους)· Πακέτο και Κλάδος είναι απλό κείμενο.
  href: string | null;
}

const SOURCE_KIND_LABEL: Readonly<Record<MessageSource["kind"], string>> = {
  item: "Γνώση",
  package: "Πακέτο",
  sector: "Κλάδος",
};

export const sourceOf = (source: MessageSource, index: number): L2Source => ({
  key: `${source.kind}-${source.id}-${index}`,
  label: `${SOURCE_KIND_LABEL[source.kind]}: «${source.title}»${source.gone ? " (δεν υπάρχει πια)" : ""}`,
  isGone: source.gone,
  href: source.kind === "item" && !source.gone ? editHref(source.id) : null,
});

export interface L2Turn {
  key: string;
  question: string | null;
  answer: string | null;
  sources: L2Source[];
  isUnanswered: boolean;
}

const emptyTurn = (key: string): L2Turn => ({
  key,
  question: null,
  answer: null,
  sources: [],
  isUnanswered: false,
});

// Τα μηνύματα (με τη σειρά τους) σε ζεύγη ερώτηση → απάντηση. Μια δεύτερη ερώτηση χωρίς απάντηση ανοίγει νέο ζεύγος.
export const turnsOf = (messages: readonly ConversationMessage[]): L2Turn[] =>
  messages.reduce<L2Turn[]>((turns, message) => {
    const last = turns.at(-1);
    if (message.role === "user")
      return [
        ...turns,
        { ...emptyTurn(message.id), question: message.content },
      ];
    const answer = {
      answer: message.content,
      sources: message.sources.map(sourceOf),
      isUnanswered: message.noSource,
    };
    return last && last.answer === null
      ? [...turns.slice(0, -1), { ...last, ...answer }]
      : [...turns, { ...emptyTurn(message.id), ...answer }];
  }, []);

export interface L2Usage {
  text: string;
  spentPercent: number;
  ceilingPercent: number;
}

const usd = (micros: number): string =>
  `$${(micros / 1_000_000).toFixed(2).replace(/\.00$/, "")}`;

// Η κατανάλωση του μήνα απέναντι στο πλαφόν· το δημόσιο μέρος ως όριο (ποσοστό του πλαφόν). null όταν ο Βοηθός είναι κλειστός.
export const usageOf = (ai: {
  spentMicros: number;
  capMicros: number;
  publicShare: number;
}): L2Usage | null => {
  if (ai.capMicros <= 0) return null;
  const ceiling = (ai.capMicros * ai.publicShare) / 100;
  return {
    text: `${usd(ai.spentMicros)} από ${usd(ai.capMicros)} πλαφόν. Όριο δημόσιου μέρους: ${usd(ceiling)} (${ai.publicShare}% του πλαφόν).`,
    spentPercent: Math.min(100, (ai.spentMicros / ai.capMicros) * 100),
    ceilingPercent: Math.min(100, ai.publicShare),
  };
};
