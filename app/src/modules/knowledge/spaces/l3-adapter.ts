// L3 (νέα εμφάνιση): οι πραγματικές Αναπάντητες (assistant_unanswered_list) στις καρτέλες, στις γραμμές και στο πάνελ
// κλεισίματος του prototype (`screens/L3.tsx`). Η επιλογή του πάνελ ζει στη διεύθυνση (?close=, ?by=, ?reason=), όπως εκεί.

import {
  askedText,
  AUDIENCE_LABEL,
  IGNORE_REASON_LABEL,
  listHref,
  UNANSWERED_PATH,
} from "../assistant-helpers";
import type { CoverOption } from "../assistant-queries";
import {
  IGNORE_REASONS,
  type IgnoreReason,
  type UnansweredList,
  type UnansweredRow,
  type UnansweredStatus,
} from "../assistant-view-schema";
import { athensDate } from "./a8-adapter";

export interface L3Selection {
  close: string | null;
  by: string | null;
  reason: IgnoreReason | null;
}

export const parseSelection = (query: {
  close?: string;
  by?: string;
  reason?: string;
}): L3Selection => ({
  close: query.close ?? null,
  by: query.by ?? null,
  reason: IGNORE_REASONS.find((reason) => reason === query.reason) ?? null,
});

const TAB_LABEL: Readonly<Record<UnansweredStatus, string>> = {
  open: "Ανοιχτές",
  covered: "Καλύφθηκαν",
  ignored: "Αγνοήθηκαν",
};

export interface L3Tab {
  label: string;
  href: string;
  isCurrent: boolean;
}

export const l3Tabs = (list: UnansweredList, tab: UnansweredStatus): L3Tab[] =>
  (["open", "covered", "ignored"] as const).map((value) => ({
    label: `${TAB_LABEL[value]} (${list.counts[value]})`,
    href: listHref(UNANSWERED_PATH, { tab: value === "open" ? null : value }),
    isCurrent: value === tab,
  }));

// Η διεύθυνση της ανοιχτής καρτέλας με μια επιλογή του πάνελ κλεισίματος.
export const closeHref = (selection: Partial<L3Selection>): string =>
  listHref(UNANSWERED_PATH, {
    close: selection.close ?? null,
    by: selection.by ?? null,
    reason: selection.reason ?? null,
  });

export interface L3Row {
  id: string;
  question: string;
  kind: string;
  asked: string;
  span: string;
  isOpen: boolean;
  isPublicQuestion: boolean;
  conversationIds: readonly string[];
}

export const l3RowOf = (item: UnansweredRow): L3Row => ({
  id: item.id,
  question: item.question,
  kind: AUDIENCE_LABEL[item.audience],
  asked: askedText(item.count),
  span: `${athensDate(item.firstAskedAt)} έως ${athensDate(item.lastAskedAt)}`,
  isOpen: item.status === "open",
  isPublicQuestion: item.audience === "public",
  conversationIds: item.conversationIds,
});

// Πώς έκλεισε: «Καλύφθηκε από …» (ή στοιχείο που δεν υπάρχει πια), «Αγνοήθηκε: …», και πότε/από ποιον.
export interface L3Closed {
  covered: { id: string; title: string } | null;
  isCoveredGone: boolean;
  ignored: string | null;
  when: string | null;
}

export const closedOf = (item: UnansweredRow): L3Closed => ({
  covered: item.status === "covered" ? item.coveredItem : null,
  isCoveredGone: item.status === "covered" && item.coveredItem === null,
  ignored:
    item.status === "ignored" && item.ignoreReason
      ? IGNORE_REASON_LABEL[item.ignoreReason]
      : null,
  when: item.closedAt
    ? `${athensDate(item.closedAt)}${item.closedByName ? ` · ${item.closedByName}` : ""}`
    : null,
});

// Η ετικέτα μιας επιλογής «Καλύφθηκε από…»: σε ερώτηση Επισκέπτη, το μη δημόσιο στοιχείο το λέει.
export const optionLabel = (
  option: CoverOption,
  isPublicQuestion: boolean,
): string =>
  isPublicQuestion && !option.isPublic
    ? `${option.title} (όχι δημόσιο)`
    : option.title;
