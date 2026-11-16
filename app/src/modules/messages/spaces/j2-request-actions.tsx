"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { isInApanto } from "./guide-signal";
import { OtherRequestHelp } from "./j2-request-help";
import { CompleteForm, Reassign, RejectForm } from "./j2-request-forms";
import { RequestGuide } from "./j2-request-guide";
import {
  DeliverablePart,
  useFilmingHref,
  type RequestActionsProps,
} from "./j2-request-parts";

export type { DeliverableSource } from "./j2-request-parts";

type Mode = null | "deliverable" | "done" | "reject";

// Οι ενέργειες ενός ανοιχτού Αιτήματος του prototype (`screens/j2-request.tsx`), δεμένες στα πραγματικά server actions.
// Στο βήμα 2 του οδηγού «Απαντώ σε Πελάτες» η απόφαση είναι ήδη διαλεγμένη (RequestGuide).
export function RequestActions(props: RequestActionsProps) {
  const search = useSearchParams();
  const isGuideStep = isInApanto(search) && search.get("step") === "2";
  if (isGuideStep && props.request.canHandle) return <RequestGuide {...props} />;
  return <ClassicActions {...props} />;
}

function ClassicActions(props: RequestActionsProps) {
  const { messageId, clientId, request, assignable } = props;
  const [mode, setMode] = useState<Mode>(null);
  const close = useCallback(() => setMode(null), []);
  const filmingHref = useFilmingHref(messageId, clientId);
  const toggle = (next: Mode) => setMode(mode === next ? null : next);
  return (
    <>
      {request.canHandle && request.kind === "other" && <OtherRequestHelp clientId={clientId} />}
      {request.canHandle && (
        <div className="btn-row">
          {request.kind === "deliverable" && (
            <button className="button" data-primary type="button" onClick={() => toggle("deliverable")}>
              Δημιουργία Παραδοτέου από το Αίτημα
            </button>
          )}
          {request.kind === "filming" && (
            <Link className="button" data-primary href={filmingHref}>
              Κλείσιμο Γυρίσματος από το Αίτημα
            </Link>
          )}
          <button className="button" type="button" onClick={() => toggle("done")}>
            Ολοκληρώθηκε
          </button>
          <button className="button" data-danger type="button" onClick={() => toggle("reject")}>
            Απόρριψη
          </button>
        </div>
      )}
      {mode === "deliverable" && <DeliverablePart {...props} onDone={close} onCancel={close} />}
      {mode === "done" && (
        <CompleteForm messageId={messageId} submitLabel="Ολοκλήρωση Αιτήματος" onDone={close} onCancel={close} />
      )}
      {mode === "reject" && (
        <RejectForm messageId={messageId} submitLabel="Απόρριψη Αιτήματος" onDone={close} onCancel={close} />
      )}
      {request.canReassign && (
        <Reassign messageId={messageId} assigneeId={request.assigneeId} assignable={assignable} />
      )}
    </>
  );
}
