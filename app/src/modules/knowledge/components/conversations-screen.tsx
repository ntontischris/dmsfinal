import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Rows, type RowItem } from "@/components/ui/rows";
import { Tabs } from "@/components/ui/segmented";

import {
  AUDIENCE_LABEL,
  conversationHref,
  CONVERSATIONS_PATH,
  formatDateTime,
  listHref,
  pageCount,
  UNANSWERED_PATH,
  whoText,
  type DoneCode,
} from "../assistant-helpers";
import {
  EMPTY_CONVERSATIONS_TEXT,
  EMPTY_CONVERSATIONS_TITLE,
  READ_ONLY_NOTE,
} from "../assistant-labels";
import type {
  ConversationAudience,
  ConversationList,
  ConversationRow,
} from "../assistant-view-schema";
import { DoneNotice } from "./done-notice";

// L2 Συζητήσεις Βοηθού: καρτέλες ανά είδος, λίστα 12 μηνών (η πιο πρόσφατη πρώτη), 50 ανά σελίδα.

const TABS: readonly { value: ConversationAudience | null; label: string }[] = [
  { value: null, label: "Όλες" },
  { value: "public", label: "Δημόσιες" },
  { value: "client", label: "Πελατών" },
  { value: "team", label: "Ομάδας" },
];

const rowOf = (row: ConversationRow): RowItem => ({
  id: row.id,
  title: row.firstQuestion ?? "(χωρίς ερώτηση)",
  href: conversationHref(row.id),
  meta: (
    <>
      <span className="block">
        {whoText(row.audience, row.who, row.clientName)} ·{" "}
        {formatDateTime(row.lastMessageAt)}
      </span>
      <span className="block text-xs">
        {row.questionCount} ερωτήσεις · {row.messageCount} μηνύματα · γλώσσα{" "}
        {row.language}
      </span>
    </>
  ),
  aside: (
    <>
      <Badge>{AUDIENCE_LABEL[row.audience]}</Badge>
      {row.noSourceCount > 0 && (
        <Badge tone="attention">χωρίς πηγή ({row.noSourceCount})</Badge>
      )}
    </>
  ),
});

interface PagerProps {
  list: ConversationList;
  audience: ConversationAudience | null;
}

function Pager({ list, audience }: PagerProps) {
  const pages = pageCount(list.total, list.pageSize);
  if (pages <= 1) return null;
  const hrefOf = (page: number) =>
    listHref(CONVERSATIONS_PATH, { tab: audience, page });
  return (
    <nav aria-label="Σελίδες" className="mt-3 flex gap-4 text-sm">
      {list.page > 1 && <Link href={hrefOf(list.page - 1)}>← Νεότερες</Link>}
      <span className="text-muted-foreground">
        Σελίδα {list.page} από {pages}
      </span>
      {list.page < pages && (
        <Link href={hrefOf(list.page + 1)}>Παλαιότερες →</Link>
      )}
    </nav>
  );
}

interface ConversationsScreenProps {
  list: ConversationList;
  audience: ConversationAudience | null;
  done: DoneCode | null;
}

export function ConversationsScreen({
  list,
  audience,
  done,
}: ConversationsScreenProps) {
  const countOf = (value: ConversationAudience | null) =>
    value === null ? list.counts.all : list.counts[value];
  return (
    <div className="grid gap-6">
      <DoneNotice done={done} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={UNANSWERED_PATH}>Αναπάντητες ερωτήσεις (L3)</Link>
        <span className="text-muted-foreground">{READ_ONLY_NOTE}</span>
      </div>
      <Tabs
        label="Είδος Συζήτησης"
        options={TABS.map((tab) => ({
          label: `${tab.label} (${countOf(tab.value)})`,
          href: listHref(CONVERSATIONS_PATH, { tab: tab.value }),
          isCurrent: tab.value === audience,
        }))}
      />
      {list.items.length === 0 ? (
        <Notice kind="empty" title={EMPTY_CONVERSATIONS_TITLE}>
          <p className="m-0">{EMPTY_CONVERSATIONS_TEXT}</p>
        </Notice>
      ) : (
        <Panel label="Συζητήσεις">
          <Rows isNumbered={false} items={list.items.map(rowOf)} />
          <Pager list={list} audience={audience} />
        </Panel>
      )}
    </div>
  );
}
