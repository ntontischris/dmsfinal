import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, type Tone } from "@/components/ui/badge";

import { resultLink } from "../request-helpers";
import {
  ASSIGNED_TO,
  AUTO_CLOSED,
  DECLARED_BY_TEAM,
  LABEL_COMMENT,
  LABEL_LINK,
  LABEL_REPLY,
  REQUEST_KIND_LABELS,
  REQUEST_NOT_DELETABLE,
  REQUEST_STATE_LABELS,
  STALE_BADGE,
  NO_ASSIGNEE,
  daysOpenText,
  requestTitle,
} from "../request-labels";
import type { MessageRequest } from "../view-schema";

const STATE_TONES: Record<MessageRequest["state"], Tone | undefined> = {
  open: "attention",
  done: "ok",
  rejected: undefined,
};

interface RequestBoxProps {
  request: MessageRequest;
  isTeamViewer: boolean;
  isMine: boolean;
  // Οι ενέργειες της ομάδας (client component), όταν ο θεατής μπορεί να χειριστεί το Αίτημα.
  actions?: ReactNode;
}

function Closing({ request, isTeamViewer }: { request: MessageRequest; isTeamViewer: boolean }) {
  const result = resultLink(request.resultKind, request.resultId, isTeamViewer);
  return (
    <div className="grid gap-1 text-sm">
      {request.automatic && <p className="m-0 text-muted-foreground">{AUTO_CLOSED}</p>}
      {request.link && (
        <p className="m-0">
          {LABEL_LINK}:{" "}
          <a href={request.link} target="_blank" rel="noopener noreferrer" className="break-all">
            {request.link}
          </a>
        </p>
      )}
      {request.comment && (
        <p className="m-0 whitespace-pre-wrap break-words">
          {LABEL_COMMENT}: {request.comment}
        </p>
      )}
      {request.reply && (
        <p className="m-0 whitespace-pre-wrap break-words">
          {LABEL_REPLY}: {request.reply}
        </p>
      )}
      {result && (
        <Link className="w-fit" href={result.href}>
          {result.label}
        </Link>
      )}
    </div>
  );
}

// Το Αίτημα ενός Μηνύματος (J2/J3): είδος, κατάσταση, υπεύθυνος και μέρες (μόνο για την ομάδα), κλείσιμο και ενέργειες.
export function RequestBox({ request, isTeamViewer, isMine, actions }: RequestBoxProps) {
  const isOpen = request.state === "open";
  return (
    <section
      aria-label={requestTitle(REQUEST_KIND_LABELS[request.kind])}
      data-request-state={request.state}
      className="grid gap-2 rounded-md border bg-muted px-3 py-2"
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <strong>{requestTitle(REQUEST_KIND_LABELS[request.kind])}</strong>
        <Badge tone={STATE_TONES[request.state]}>{REQUEST_STATE_LABELS[request.state]}</Badge>
        {isTeamViewer && request.stale && <Badge tone="attention">{STALE_BADGE}</Badge>}
      </header>
      {isTeamViewer && (
        <p className="m-0 text-sm text-muted-foreground">
          {ASSIGNED_TO}: {request.assigneeName ?? NO_ASSIGNEE}
          {isOpen && typeof request.daysOpen === "number" && ` · ${daysOpenText(request.daysOpen)}`}
          {request.declaredBy === "team" && ` · ${DECLARED_BY_TEAM}`}
        </p>
      )}
      {!isOpen && <Closing request={request} isTeamViewer={isTeamViewer} />}
      {!isTeamViewer && isMine && (
        <p className="m-0 text-xs text-muted-foreground">{REQUEST_NOT_DELETABLE}</p>
      )}
      {actions}
    </section>
  );
}
