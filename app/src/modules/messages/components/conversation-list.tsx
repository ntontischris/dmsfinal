import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import { formatWhen, previewLine, threadHref } from "../helpers";
import { PARTIAL_BADGE, unreadBadge } from "../labels";
import type { InboxItem } from "../view-schema";

// Μία γραμμή ανά Πελάτη με ορατά Μηνύματα: όνομα, ώρα, αδιάβαστα, προεπισκόπηση.
export function ConversationList({ items }: { items: readonly InboxItem[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((item) => (
        <li key={item.clientId}>
          <Link
            href={threadHref(item.clientId)}
            className="grid gap-1 rounded-md border bg-card px-4 py-3 no-underline hover:border-border-strong"
          >
            <span className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{item.clientName}</strong>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <time dateTime={item.lastAt}>{formatWhen(item.lastAt)}</time>
                {item.unread > 0 && <Badge tone="strong">{unreadBadge(item.unread)}</Badge>}
              </span>
            </span>
            <span className="min-w-0 break-words text-sm text-muted-foreground">{previewLine(item)}</span>
            {item.partial && (
              <span>
                <Badge>{PARTIAL_BADGE}</Badge>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
