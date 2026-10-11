import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { formatWhen, threadHref, truncate } from "../helpers";
import { OPEN_LABEL } from "../labels";
import type { MentionItem } from "../view-schema";

const BODY_LIMIT = 240;

// «Με ανέφεραν»: τα Εσωτερικά Μηνύματα όπου αναφέρεται ο Χρήστης, νεότερα πρώτα.
export function MentionList({ items }: { items: readonly MentionItem[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {items.map((item) => (
        <li key={item.messageId} className="grid gap-2 rounded-md border bg-card px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <strong>{item.clientName}</strong>
            <time className="text-sm text-muted-foreground" dateTime={item.at}>
              {formatWhen(item.at)}
            </time>
          </div>
          <p className="m-0 break-words text-sm">
            {item.authorName ? `${item.authorName}: ` : ""}
            {truncate(item.body, BODY_LIMIT)}
          </p>
          <div>
            <Link className={buttonVariants({ size: "sm" })} href={`${threadHref(item.clientId)}#m-${item.messageId}`}>
              {OPEN_LABEL}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
