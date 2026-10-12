import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";

import {
  notificationsHref,
  relativeTime,
  type NotificationFilter,
} from "../helpers";
import {
  EMPTY_TEXT,
  EMPTY_TITLE,
  FILTER_ALL,
  FILTER_LABEL,
  FILTER_UNREAD,
  NEW_BADGE,
  OLDER_LABEL,
  OPEN_LABEL,
  RETENTION_NOTE,
  inboxTabLabel,
} from "../labels";
import type { NotificationItem, NotificationPage } from "../view-schema";
import { MarkAllRead } from "./mark-all-read";
import { OpenButton } from "./open-button";

// A2 «Εισερχόμενα»: φίλτρο, «Όλες διαβασμένες», λίστα με «Άνοιγμα» και «Παλαιότερες». Οι Προτιμήσεις έρχονται στο Kδ.

function NotificationRow({ item, now }: { item: NotificationItem; now: Date }) {
  return (
    <li
      className="grid gap-1 border-b px-1 py-3 last:border-b-0"
      data-unread={!item.isRead}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <time dateTime={item.createdAt}>
          {relativeTime(item.createdAt, now)}
        </time>
        {!item.isRead && <Badge tone="strong">{NEW_BADGE}</Badge>}
      </div>
      <p className="m-0 font-medium">{item.title}</p>
      {item.body && (
        <p className="m-0 text-sm text-muted-foreground">{item.body}</p>
      )}
      <div>
        <OpenButton id={item.id} className={buttonVariants({ size: "sm" })}>
          {OPEN_LABEL}
          <span className="sr-only">: {item.title}</span>
        </OpenButton>
      </div>
    </li>
  );
}

function Toolbar({
  filter,
  unread,
}: {
  filter: NotificationFilter;
  unread: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Segmented
        label={FILTER_LABEL}
        options={[
          {
            label: FILTER_UNREAD,
            href: notificationsHref("unread"),
            isCurrent: filter === "unread",
            count: unread,
          },
          {
            label: FILTER_ALL,
            href: notificationsHref("all"),
            isCurrent: filter === "all",
          },
        ]}
      />
      <MarkAllRead isDisabled={unread === 0} />
    </div>
  );
}

interface NotificationsScreenProps {
  page: NotificationPage;
  filter: NotificationFilter;
  now: Date;
}

export function NotificationsScreen({
  page,
  filter,
  now,
}: NotificationsScreenProps) {
  const last = page.items.at(-1);
  return (
    <section className="grid gap-4" aria-label={inboxTabLabel(page.unread)}>
      <h2 className="m-0 text-base font-semibold">
        {inboxTabLabel(page.unread)}
      </h2>
      <Toolbar filter={filter} unread={page.unread} />
      {page.items.length > 0 ? (
        <ul className="m-0 list-none rounded-md border bg-card px-3 py-0">
          {page.items.map((item) => (
            <NotificationRow key={item.id} item={item} now={now} />
          ))}
        </ul>
      ) : (
        <Notice kind="empty" title={EMPTY_TITLE}>
          {EMPTY_TEXT}
        </Notice>
      )}
      {page.hasMore && last && (
        <div>
          <Link
            href={notificationsHref(filter, last.createdAt)}
            className={buttonVariants()}
          >
            {OLDER_LABEL}
          </Link>
        </div>
      )}
      <p className="m-0 text-sm text-muted-foreground">{RETENTION_NOTE}</p>
    </section>
  );
}
