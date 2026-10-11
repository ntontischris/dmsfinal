import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import { formatWhen } from "../helpers";
import { DELIVERABLES_PATH } from "../request-helpers";
import {
  CHANGE_DECIDED,
  CHANGE_NOTE,
  CHANGE_TITLE,
  CLIENT_CHANGE_DONE,
  CLIENT_CHANGE_OPEN,
  CLIENT_DELIVERABLE_LINK,
  OPEN_RESULT_DELIVERABLE,
  REQUEST_STATE_LABELS,
  changeAbout,
} from "../request-labels";
import type { ChangeRequest } from "../view-schema";

// Αίτημα αλλαγής μετά την έγκριση στη χρονική του θέση στο νήμα (Μ12). Η απόφαση παίρνεται στη σελίδα του Παραδοτέου.
export function ChangeRequestItem({ change, isTeamViewer }: { change: ChangeRequest; isTeamViewer: boolean }) {
  const isOpen = change.state === "open";
  return (
    <article
      id={`cr-${change.id}`}
      className="grid min-w-0 gap-1.5 rounded-md border border-dashed bg-card px-4 py-3"
    >
      <header className="flex flex-wrap items-baseline gap-2 text-sm">
        <strong>{CHANGE_TITLE}</strong>
        <time className="text-muted-foreground" dateTime={change.at}>
          {formatWhen(change.at)}
        </time>
        <Badge tone={isOpen ? "attention" : "ok"}>{REQUEST_STATE_LABELS[isOpen ? "open" : "done"]}</Badge>
      </header>
      <p className="m-0 text-sm text-muted-foreground">{changeAbout(change.deliverableTitle)}</p>
      <p className="m-0 whitespace-pre-wrap break-words">{change.body}</p>
      {isTeamViewer ? (
        <p className="m-0 text-sm text-muted-foreground">{isOpen ? CHANGE_NOTE : CHANGE_DECIDED}</p>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">{isOpen ? CLIENT_CHANGE_OPEN : CLIENT_CHANGE_DONE}</p>
      )}
      <Link className="w-fit text-sm" href={`${DELIVERABLES_PATH}/${change.deliverableId}`}>
        {isTeamViewer ? OPEN_RESULT_DELIVERABLE : CLIENT_DELIVERABLE_LINK}
      </Link>
    </article>
  );
}
