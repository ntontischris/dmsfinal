"use client";

import Link from "next/link";
import { useState } from "react";

import {
  DeliverablePart,
  useFilmingHref,
  type RequestActionsProps,
} from "./j2-request-parts";
import { OtherRequestHelp } from "./j2-request-help";
import { CompleteForm, Reassign, RejectForm } from "./j2-request-forms";
import {
  choicesOf,
  defaultChoiceOf,
  hasOthersToAssign,
  type ChoiceOption,
  type RequestChoice,
} from "./request-choice";

const CONTINUE = "Συνέχεια";

// Η συνέχεια μετά την αποθήκευση είναι του οδηγού (περνά μόνος του στο βήμα 3 ή στην επόμενη γραμμή).
const stay = (): void => {};

function ChoiceButton({
  option,
  isSelected,
  onPick,
}: {
  option: ChoiceOption;
  isSelected: boolean;
  onPick: (choice: RequestChoice) => void;
}) {
  return (
    <span className="j2-choice">
      <button
        className="button"
        type="button"
        aria-pressed={isSelected}
        data-selected={isSelected || undefined}
        data-danger={option.choice === "reject" || undefined}
        disabled={option.blockedBy !== null}
        title={option.blockedBy ?? undefined}
        onClick={() => onPick(option.choice)}
      >
        {option.label}
      </button>
      {option.blockedBy && <small className="muted">{option.blockedBy}</small>}
      {option.warning && <small className="j2-warning">{option.warning}</small>}
    </span>
  );
}

function ChosenForm({ choice, props }: { choice: RequestChoice; props: RequestActionsProps }) {
  const { messageId, clientId } = props;
  const filmingHref = useFilmingHref(messageId, clientId);
  if (choice === "deliverable")
    return <DeliverablePart {...props} submitLabel={CONTINUE} onDone={stay} />;
  if (choice === "filming")
    return (
      <div className="btn-row">
        <Link className="button" data-primary href={filmingHref}>
          {CONTINUE}
        </Link>
        <span className="muted">Συνεχίζει στον οδηγό «Στήνω γύρισμα» με τον Πελάτη και το Αίτημα μέσα.</span>
      </div>
    );
  if (choice === "reject") return <RejectForm messageId={messageId} submitLabel={CONTINUE} onDone={stay} />;
  return (
    <>
      {props.request.kind === "other" && <OtherRequestHelp clientId={clientId} />}
      <CompleteForm messageId={messageId} submitLabel={CONTINUE} onDone={stay} />
    </>
  );
}

// Βήμα 2 του οδηγού «Απαντώ σε Πελάτες»: τέσσερις επιλογές, η προεπιλεγμένη (από το είδος του Αιτήματος) τονισμένη,
// η φόρμα της από κάτω και ένα κύριο κουμπί «Συνέχεια». Η «Αλλαγή υπευθύνου» μένει στο «Περισσότερα».
export function RequestGuide(props: RequestActionsProps) {
  const { messageId, request, assignable, viewerId, hasAgreement } = props;
  const [choice, setChoice] = useState<RequestChoice>(() => defaultChoiceOf(request.kind, hasAgreement));
  return (
    <div className="j2-guide-choice" data-flow-request-open="true">
      <div className="btn-row" role="group" aria-label="Τι κάνουμε με αυτό που ζητά;">
        {choicesOf(request.kind, hasAgreement).map((option) => (
          <ChoiceButton key={option.choice} option={option} isSelected={option.choice === choice} onPick={setChoice} />
        ))}
      </div>
      <ChosenForm key={choice} choice={choice} props={props} />
      {request.canReassign && hasOthersToAssign(assignable, viewerId) && (
        <details className="j2-more">
          <summary className="muted">Περισσότερα</summary>
          <Reassign messageId={messageId} assigneeId={request.assigneeId} assignable={assignable} />
        </details>
      )}
    </div>
  );
}
