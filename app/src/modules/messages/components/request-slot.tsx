import {
  NewDeliverableForm,
  getDeliverableCandidates,
  type DeliverableCandidates,
} from "@/modules/deliverables";

import { createDeliverableFromRequest } from "../actions-requests";
import {
  CREATE_DELIVERABLE_NEEDS_TAG,
  CREATE_DELIVERABLE_NO_ACCESS,
  CREATE_DELIVERABLE_SUBMIT,
} from "../request-labels";
import type { Thread, ThreadMessage } from "../view-schema";
import { RequestActions } from "./request-actions";
import { RequestBox } from "./request-box";

export type CandidatesByProduction = ReadonlyMap<string, DeliverableCandidates | null>;

const needsDeliverableForm = (message: ThreadMessage): boolean =>
  message.request?.state === "open" &&
  message.request.kind === "deliverable" &&
  message.request.canHandle === true &&
  message.productionId !== null;

// Τα υποψήφια Παραδοτέου (είδη, υπεύθυνοι, Γυρίσματα) ανά Παραγωγή, μόνο για τα ανοιχτά Αιτήματα νέου Παραδοτέου που χειρίζεται ο θεατής.
export async function loadCandidates(thread: Thread): Promise<CandidatesByProduction> {
  const ids = new Set(
    thread.messages.filter(needsDeliverableForm).flatMap((message) => (message.productionId ? [message.productionId] : [])),
  );
  const entries = await Promise.all(
    [...ids].map(async (id) => {
      const result = await getDeliverableCandidates(id);
      return [id, result.ok ? result.data : null] as const;
    }),
  );
  return new Map(entries);
}

function DeliverableForm({
  thread,
  message,
  candidates,
}: {
  thread: Thread;
  message: ThreadMessage;
  candidates: CandidatesByProduction;
}) {
  const note = (text: string) => <p className="m-0 text-sm text-muted-foreground">{text}</p>;
  if (message.productionId === null) return note(CREATE_DELIVERABLE_NEEDS_TAG);
  const found = candidates.get(message.productionId) ?? null;
  if (found === null) return note(CREATE_DELIVERABLE_NO_ACCESS);
  return (
    <NewDeliverableForm
      productionId={message.productionId}
      defaultTitle={`${thread.client.name} — ${message.productionTitle ?? ""}`}
      isInternal={false}
      candidates={found}
      fromRequest={{
        messageId: message.id,
        action: createDeliverableFromRequest,
        submitLabel: CREATE_DELIVERABLE_SUBMIT,
      }}
    />
  );
}

// Το Αίτημα ενός Μηνύματος όπως το βλέπει η ομάδα, με τις ενέργειες όταν μπορεί να το χειριστεί.
export function TeamRequestBox({
  thread,
  message,
  candidates,
}: {
  thread: Thread;
  message: ThreadMessage;
  candidates: CandidatesByProduction;
}) {
  const request = message.request;
  if (request === null) return null;
  const canAct = request.state === "open" && (request.canHandle === true || request.canReassign === true);
  return (
    <RequestBox
      request={request}
      isTeamViewer
      isMine={false}
      actions={
        canAct ? (
          <RequestActions
            messageId={message.id}
            clientId={thread.client.id}
            request={request}
            assignable={thread.assignable ?? []}
            deliverableForm={<DeliverableForm thread={thread} message={message} candidates={candidates} />}
          />
        ) : undefined
      }
    />
  );
}
