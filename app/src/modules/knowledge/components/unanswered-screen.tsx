import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/segmented";

import { reopenUnanswered } from "../assistant-actions";
import {
  askedText,
  AUDIENCE_LABEL,
  conversationHref,
  CONVERSATIONS_PATH,
  formatDateTime,
  IGNORE_REASON_LABEL,
  listHref,
  UNANSWERED_PATH,
  type DoneCode,
} from "../assistant-helpers";
import {
  EMPTY_CLOSED_TEXT,
  EMPTY_CLOSED_TITLE,
  EMPTY_OPEN_TEXT,
  EMPTY_OPEN_TITLE,
  UNANSWERED_FOOTNOTE,
  UNANSWERED_INTRO,
} from "../assistant-labels";
import type { CoverOption } from "../assistant-queries";
import type {
  UnansweredList,
  UnansweredRow,
  UnansweredStatus,
} from "../assistant-view-schema";
import { editHref } from "../helpers";
import { ActionForm } from "./action-form";
import { DoneNotice } from "./done-notice";
import { UnansweredClose } from "./unanswered-close";

// L3 Αναπάντητες ερωτήσεις: καρτέλες Ανοιχτές / Καλύφθηκαν / Αγνοήθηκαν, κλείσιμο και «Ξανάνοιγμα».

function ClosedStatus({ item }: { item: UnansweredRow }) {
  const covered = item.coveredItem;
  return (
    <div className="grid gap-2 text-sm">
      {item.status === "covered" &&
        (covered ? (
          <span>
            Καλύφθηκε από{" "}
            <Link href={editHref(covered.id)}>«{covered.title}»</Link>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Καλύφθηκε από στοιχείο που δεν υπάρχει πια
          </span>
        ))}
      {item.status === "ignored" && item.ignoreReason && (
        <span className="text-muted-foreground">
          Αγνοήθηκε: {IGNORE_REASON_LABEL[item.ignoreReason]}
        </span>
      )}
      {item.closedAt && (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(item.closedAt)}
          {item.closedByName ? ` · ${item.closedByName}` : ""}
        </span>
      )}
      <ActionForm
        action={reopenUnanswered}
        submitLabel="Ξανάνοιγμα"
        pendingLabel="Άνοιγμα…"
      >
        <input type="hidden" name="id" value={item.id} />
      </ActionForm>
    </div>
  );
}

interface ItemViewProps {
  item: UnansweredRow;
  options: readonly CoverOption[];
}

function ItemView({ item, options }: ItemViewProps) {
  return (
    <li className="grid gap-2 border-b py-3">
      <span className="text-[1.05rem] font-medium break-words">
        «{item.question}»
      </span>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge>{AUDIENCE_LABEL[item.audience]}</Badge>
        <span>{askedText(item.count)}</span>
        <span>
          {formatDateTime(item.firstAskedAt)} έως{" "}
          {formatDateTime(item.lastAskedAt)}
        </span>
      </div>
      {item.conversationIds.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-muted-foreground">Συζητήσεις:</span>
          {item.conversationIds.map((id) => (
            <Link key={id} href={conversationHref(id)}>
              Άνοιξε τη Συζήτηση
            </Link>
          ))}
        </div>
      )}
      {item.status === "open" ? (
        <UnansweredClose item={item} options={options} />
      ) : (
        <ClosedStatus item={item} />
      )}
    </li>
  );
}

const TABS: readonly { value: UnansweredStatus; label: string }[] = [
  { value: "open", label: "Ανοιχτές" },
  { value: "covered", label: "Καλύφθηκαν" },
  { value: "ignored", label: "Αγνοήθηκαν" },
];

interface UnansweredScreenProps {
  list: UnansweredList;
  tab: UnansweredStatus;
  options: readonly CoverOption[];
  done: DoneCode | null;
}

export function UnansweredScreen({
  list,
  tab,
  options,
  done,
}: UnansweredScreenProps) {
  const isOpen = tab === "open";
  return (
    <div className="grid gap-6">
      <DoneNotice done={done} />
      <div className="grid gap-1 text-sm">
        <Link href={CONVERSATIONS_PATH}>Συζητήσεις Βοηθού (L2)</Link>
        <span className="text-muted-foreground">{UNANSWERED_INTRO}</span>
      </div>
      <Tabs
        label="Αναπάντητες ερωτήσεις"
        options={TABS.map((option) => ({
          label: `${option.label} (${list.counts[option.value]})`,
          href: listHref(UNANSWERED_PATH, {
            tab: option.value === "open" ? null : option.value,
          }),
          isCurrent: option.value === tab,
        }))}
      />
      {list.items.length === 0 ? (
        <Notice
          kind="empty"
          title={isOpen ? EMPTY_OPEN_TITLE : EMPTY_CLOSED_TITLE}
        >
          <p className="m-0">{isOpen ? EMPTY_OPEN_TEXT : EMPTY_CLOSED_TEXT}</p>
        </Notice>
      ) : (
        <Panel label="Ερωτήσεις">
          {list.items.length < list.counts[tab] ? (
            <p className="m-0 pb-2 text-sm text-muted-foreground">
              {`Δείχνονται ${list.items.length} από ${list.counts[tab]}, ${isOpen ? "οι πιο συχνές" : "οι πιο πρόσφατες"} πρώτες.`}
            </p>
          ) : null}
          <ul className="m-0 list-none border-t p-0">
            {list.items.map((item) => (
              <ItemView key={item.id} item={item} options={options} />
            ))}
          </ul>
        </Panel>
      )}
      <p className="m-0 text-sm text-muted-foreground">{UNANSWERED_FOOTNOTE}</p>
    </div>
  );
}
