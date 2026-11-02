import Link from "next/link";

import { Badge } from "@/spaces/screens/shared";

import type { CandidatesByProduction } from "../components/request-slot";
import {
  CREATE_DELIVERABLE_NEEDS_TAG,
  CREATE_DELIVERABLE_NO_ACCESS,
  CHANGE_DECIDED,
  CHANGE_NOTE,
} from "../request-labels";
import type { Thread } from "../view-schema";
import type { J2Change, J2Message, J2Request } from "./j2-adapter";
import { RequestActions, type DeliverableSource } from "./j2-request-actions";

function ClosingInfo({ request }: { request: J2Request }) {
  if (request.isOpen) return null;
  return (
    <>
      {request.link && (
        <p>
          Σύνδεσμος:{" "}
          <a href={request.link} target="_blank" rel="noopener noreferrer">
            {request.link}
          </a>
        </p>
      )}
      {request.comment && <p>Σχόλιο: {request.comment}</p>}
      {request.reply && <p>Απάντηση προς τον πελάτη: {request.reply}</p>}
      {request.result && (
        <p>
          <Link href={request.result.href}>{request.result.label}</Link>
        </p>
      )}
      {request.isAutomatic && <p className="muted">έκλεισε μόνο του</p>}
    </>
  );
}

// Τα υποψήφια της Παραγωγής για τη φόρμα νέου Παραδοτέου, ή γιατί δεν γίνεται.
function deliverableSourceOf(
  thread: Thread,
  message: J2Message,
  candidates: CandidatesByProduction,
): DeliverableSource {
  if (message.productionId === null)
    return { note: CREATE_DELIVERABLE_NEEDS_TAG };
  const found = candidates.get(message.productionId) ?? null;
  if (found === null) return { note: CREATE_DELIVERABLE_NO_ACCESS };
  return {
    productionId: message.productionId,
    defaultTitle: `${thread.client.name} — ${message.tagTitle ?? ""}`,
    candidates: found,
  };
}

// Το Αίτημα ενός Μηνύματος του prototype (`screens/j2-request.tsx`): είδος, κατάσταση, υπεύθυνος, μέρες, κλείσιμο και
// ενέργειες όταν ο Χρήστης μπορεί να το χειριστεί.
export function RequestBox({
  thread,
  message,
  candidates,
}: {
  thread: Thread;
  message: J2Message;
  candidates: CandidatesByProduction;
}) {
  const request = message.request;
  if (request === null) return null;
  return (
    <div className="j2-req">
      <div className="j2-req-head">
        <strong>{request.title}</strong>
        <Badge tone={request.isOpen ? "strong" : undefined}>
          {request.state}
        </Badge>
        {request.isStale && <Badge tone="attention">χρειάζεται προσοχή</Badge>}
      </div>
      <p>{request.assignee}</p>
      {request.daysOpen && <p className="muted">{request.daysOpen}</p>}
      {request.isDeclaredByTeam && (
        <p className="muted">σημειώθηκε ως Αίτημα από την ομάδα</p>
      )}
      <ClosingInfo request={request} />
      {(request.canHandle || request.canReassign) && (
        <RequestActions
          messageId={message.id}
          clientId={thread.client.id}
          request={request}
          assignable={thread.assignable ?? []}
          deliverable={deliverableSourceOf(thread, message, candidates)}
        />
      )}
    </div>
  );
}

// Αίτημα αλλαγής μετά την έγκριση στη χρονική του θέση (Μ12), στο σχήμα Αιτήματος του prototype: η απόφαση παίρνεται στη
// σελίδα του Παραδοτέου.
export function ChangeBubble({ change }: { change: J2Change }) {
  return (
    <article className="jmsg" id={`cr-${change.id}`} data-side="client">
      <header className="jmsg-head">
        <strong>{change.about}</strong>
        <span className="muted">{change.when}</span>
      </header>
      <p className="jmsg-text">{change.body}</p>
      <div className="j2-req">
        <div className="j2-req-head">
          <strong>Αίτημα: Αλλαγή μετά την έγκριση</strong>
          <Badge tone={change.isOpen ? "strong" : undefined}>
            {change.state}
          </Badge>
        </div>
        <p className="note">{change.isOpen ? CHANGE_NOTE : CHANGE_DECIDED}</p>
        <Link className="button" href={change.deliverableHref}>
          Άνοιγμα Παραδοτέου
        </Link>
      </div>
    </article>
  );
}
