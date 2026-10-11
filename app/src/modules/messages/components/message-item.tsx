import Link from "next/link";

import { cn } from "@/lib/cn";

import { formatWhen, threadHref } from "../helpers";
import {
  MESSAGE_DELETED,
  MESSAGE_EDITED,
  MESSAGE_INTERNAL,
  MESSAGE_MENTIONS,
  MESSAGE_TO_CLIENT,
} from "../labels";
import type { ThreadMessage, ThreadProduction } from "../view-schema";
import { MessageActions } from "./message-actions";
import { NewMark } from "./new-mark";

interface MessageItemProps {
  clientId: string;
  message: ThreadMessage;
  productions: readonly ThreadProduction[];
  canClearTag: boolean;
  isTeamViewer: boolean;
}

// Ένα Μήνυμα της Συνομιλίας: αποστολέας, ώρα, ετικέτα, κείμενο, ενδείξεις και ενέργειες.
export function MessageItem({
  clientId,
  message,
  productions,
  canClearTag,
  isTeamViewer,
}: MessageItemProps) {
  const isInternal = message.internal === true;
  const mentions = message.mentions ?? [];
  return (
    <article
      id={`m-${message.id}`}
      data-internal={isInternal}
      className={cn(
        "grid min-w-0 gap-1.5 rounded-md border bg-card px-4 py-3",
        message.authorKind === "client" && "border-l-4 border-l-ok",
        isInternal && "border-dashed border-primary/60",
      )}
    >
      <header className="flex flex-wrap items-baseline gap-2 text-sm">
        <strong>{message.authorName ?? "—"}</strong>
        {isTeamViewer && message.authorKind === "team" && !isInternal && (
          <span className="text-muted-foreground">{MESSAGE_TO_CLIENT}</span>
        )}
        <time className="text-muted-foreground" dateTime={message.at}>
          {formatWhen(message.at)}
        </time>
        <NewMark message={message} />
      </header>
      {isInternal && (
        <p className="m-0 text-sm font-semibold text-primary">
          {MESSAGE_INTERNAL}
        </p>
      )}
      {message.productionTitle &&
        (isTeamViewer && message.productionId ? (
          <Link
            className="w-fit text-sm"
            href={threadHref(clientId, { production: message.productionId })}
          >
            {message.productionTitle}
          </Link>
        ) : (
          <span className="w-fit text-sm text-muted-foreground">
            {message.productionTitle}
          </span>
        ))}
      {message.deleted ? (
        <p className="m-0 text-sm text-muted-foreground">{MESSAGE_DELETED}</p>
      ) : (
        <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
      )}
      {mentions.length > 0 && (
        <p className="m-0 text-sm text-muted-foreground">
          {MESSAGE_MENTIONS}:{" "}
          {mentions.map((mention) => mention.name).join(", ")}
        </p>
      )}
      {message.editedAt && !message.deleted && (
        <p className="m-0 text-xs text-muted-foreground">{MESSAGE_EDITED}</p>
      )}
      <MessageActions
        message={message}
        productions={productions}
        canClearTag={canClearTag}
        canTag={isTeamViewer}
      />
    </article>
  );
}
