import Link from "next/link";

import { Badge, type Tone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";

import { truncate } from "../helpers";
import { queueItemHref, requestsHref, resultLink, visibleViews, type RequestView } from "../request-helpers";
import {
  ASSIGNMENT_NOTE,
  AUTO_CLOSED,
  LABEL_COMMENT,
  LABEL_LINK,
  LABEL_REPLY,
  OPEN_REQUEST,
  REQUESTS_EMPTY,
  REQUESTS_VIEWS_LABEL,
  REQUEST_KIND_LABELS,
  REQUEST_STATE_LABELS,
  STALE_BADGE,
  UNASSIGNED_NOTE,
  VIEW_LABELS,
  assigneeText,
  daysOpenText,
} from "../request-labels";
import type { QueueItem, RequestsView } from "../view-schema";

const TEXT_LIMIT = 120;
const TONES: Record<QueueItem["state"], Tone | undefined> = { open: "attention", done: "ok", rejected: undefined };

function ClosedInfo({ closed }: { closed: NonNullable<QueueItem["closed"]> }) {
  const result = resultLink(closed.resultKind, closed.resultId);
  return (
    <div className="grid gap-0.5 text-sm text-muted-foreground">
      {closed.automatic && <span>{AUTO_CLOSED}</span>}
      {closed.link && (
        <span className="break-all">
          {LABEL_LINK}: {closed.link}
        </span>
      )}
      {closed.comment && (
        <span>
          {LABEL_COMMENT}: {truncate(closed.comment, TEXT_LIMIT)}
        </span>
      )}
      {closed.reply && (
        <span>
          {LABEL_REPLY}: {truncate(closed.reply, TEXT_LIMIT)}
        </span>
      )}
      {result && (
        <Link className="w-fit" href={result.href}>
          {result.label}
        </Link>
      )}
    </div>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const isOpen = item.state === "open";
  return (
    <li className="grid min-w-0 gap-1.5 rounded-md border bg-card px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <strong>{REQUEST_KIND_LABELS[item.kind]}</strong>
        <Badge tone={TONES[item.state]}>{REQUEST_STATE_LABELS[item.state]}</Badge>
        {item.stale && <Badge tone="attention">{STALE_BADGE}</Badge>}
        <span className="text-muted-foreground">
          {item.clientName}
          {item.productionTitle ? ` · ${item.productionTitle}` : ""}
        </span>
      </div>
      {item.text && <p className="m-0 whitespace-pre-wrap break-words">{truncate(item.text, TEXT_LIMIT)}</p>}
      {isOpen && (
        <p className="m-0 text-sm text-muted-foreground">
          {assigneeText(item.assigneeName)}
          {item.daysOpen !== null && ` · ${daysOpenText(item.daysOpen)}`}
        </p>
      )}
      {item.closed && <ClosedInfo closed={item.closed} />}
      <div>
        <Link className={cn(buttonVariants({ size: "sm" }), "no-underline")} href={queueItemHref(item)}>
          {OPEN_REQUEST}
        </Link>
      </div>
    </li>
  );
}

interface RequestsTabProps {
  data: RequestsView;
  view: RequestView;
  canTransfer: boolean;
}

// J1, καρτέλα «Αιτήματα»: όψεις «για μένα», «όλα τα ανοιχτά», «χωρίς υπεύθυνο» (με «Μεταβιβάζει Υπεύθυνο», όχι όταν είναι ένας) και «κλεισμένα».
export function RequestsTab({ data, view, canTransfer }: RequestsTabProps) {
  const views = visibleViews({ canReassign: canTransfer, solo: data.solo });
  const options = views.map((name) => ({
    label: VIEW_LABELS[name],
    href: requestsHref(name),
    isCurrent: name === view,
    count: name === "mine" ? data.counts.mine : name === "unassigned" ? data.counts.unassigned : undefined,
  }));
  return (
    <div className="grid gap-4">
      <Segmented label={REQUESTS_VIEWS_LABEL} options={options} />
      {view === "unassigned" && <p className="m-0 text-sm text-muted-foreground">{UNASSIGNED_NOTE}</p>}
      {data.items.length === 0 ? (
        <Notice kind="empty" title={REQUESTS_EMPTY[view]} />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {data.items.map((item) => (
            <QueueRow key={`${item.messageId ?? item.deliverableId}-${item.at}`} item={item} />
          ))}
        </ul>
      )}
      <p className="m-0 text-sm text-muted-foreground">{ASSIGNMENT_NOTE}</p>
    </div>
  );
}
