import Link from "next/link";

import { Badge, type Tone } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";

import { formatWhen } from "../helpers";
import { clientChatHref, clientDeliverableHref, resultLink, sortClientRequests } from "../request-helpers";
import {
  CLIENT_DELIVERABLE_LINK,
  CLIENT_REQUESTS_EMPTY_TEXT,
  CLIENT_REQUESTS_EMPTY_TITLE,
  CLIENT_SEE_IN_CHAT,
  CLIENT_TEAM_REPLY,
  LABEL_COMMENT,
  LABEL_LINK,
  REQUEST_KIND_LABELS,
  REQUEST_STATE_LABELS,
  AUTO_CLOSED,
} from "../request-labels";
import type { ClientRequest } from "../view-schema";

const TONES: Record<ClientRequest["state"], Tone | undefined> = { open: "attention", done: "ok", rejected: undefined };

// Η κατάσταση ενός Αιτήματος για τον πελάτη: σύνδεσμος και σχόλιο όταν ολοκληρώθηκε, «Απάντηση της ομάδας» όταν απορρίφθηκε.
// Ποτέ υπεύθυνος ή μέρες.
function StateBox({ item }: { item: ClientRequest }) {
  const result = resultLink(item.resultKind, item.resultId, false);
  if (item.state === "open") return null;
  return (
    <div className="grid gap-1 rounded-md border bg-muted px-3 py-2 text-sm">
      {item.state === "rejected" && (
        <p className="m-0 whitespace-pre-wrap break-words">
          {CLIENT_TEAM_REPLY}: {item.reply}
        </p>
      )}
      {item.state === "done" && (
        <>
          {item.automatic && <p className="m-0 text-muted-foreground">{AUTO_CLOSED}</p>}
          {item.link && (
            <p className="m-0">
              {LABEL_LINK}:{" "}
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="break-all">
                {item.link}
              </a>
            </p>
          )}
          {item.comment && (
            <p className="m-0 whitespace-pre-wrap break-words">
              {LABEL_COMMENT}: {item.comment}
            </p>
          )}
          {result && result.href !== clientDeliverableHref(item) && (
            <Link className="w-fit" href={result.href}>
              {result.label}
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function RequestRow({ item }: { item: ClientRequest }) {
  const deliverableHref = clientDeliverableHref(item);
  const chatHref = clientChatHref(item);
  return (
    <li className="grid min-w-0 gap-1.5 rounded-md border bg-card px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <strong>{REQUEST_KIND_LABELS[item.kind]}</strong>
        <Badge tone={TONES[item.state]}>{REQUEST_STATE_LABELS[item.state]}</Badge>
        <time className="text-muted-foreground" dateTime={item.at}>
          {formatWhen(item.at)}
        </time>
      </div>
      {item.kind === "change" && item.deliverableTitle && (
        <p className="m-0 text-sm text-muted-foreground">{item.deliverableTitle}</p>
      )}
      {item.text && <p className="m-0 whitespace-pre-wrap break-words">{item.text}</p>}
      <StateBox item={item} />
      <div className="flex flex-wrap gap-3 text-sm">
        {chatHref && <Link href={chatHref}>{CLIENT_SEE_IN_CHAT}</Link>}
        {deliverableHref && <Link href={deliverableHref}>{CLIENT_DELIVERABLE_LINK}</Link>}
      </div>
    </li>
  );
}

// Η καρτέλα «Αιτήματα» του πελάτη (J3): ανοιχτά πρώτα, μετά τα νεότερα.
export function ClientRequestsList({ items }: { items: readonly ClientRequest[] }) {
  if (items.length === 0) {
    return (
      <Notice kind="empty" title={CLIENT_REQUESTS_EMPTY_TITLE}>
        <p className="m-0">{CLIENT_REQUESTS_EMPTY_TEXT}</p>
      </Notice>
    );
  }
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {sortClientRequests(items).map((item) => (
        <RequestRow key={`${item.messageId ?? item.deliverableId}-${item.at}`} item={item} />
      ))}
    </ul>
  );
}
