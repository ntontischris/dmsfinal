"use client";

import { useState } from "react";

import {
  PROPOSAL_VALIDITY_DAYS,
  currentRevision,
  type AgreementRecord,
} from "@/data/agreements";
import type { AgreementCaps } from "@/data/agreements-access";
import { LOSS_REASONS } from "@/data/opportunities";
import { TODAY } from "@/data/sales";
import { OutsideSignatureForm } from "@/screens/d2-outside";
import { daysBetween, needsApproval, revisionNumber } from "@/screens/d2-model";
import {
  closeLost,
  decide,
  extend,
  newRevision,
  requestApproval,
  send,
  type Change,
} from "@/screens/d2-transitions";
import { NumberInput } from "@/screens/d2-ui";
import { Badge, fmtDate } from "@/screens/shared";

export interface ActionProps {
  draft: AgreementRecord;
  caps: AgreementCaps;
  actor: string;
  approved: readonly string[];
  act: (change: Change, notice: string, approves?: boolean) => void;
}

function DraftActions({ draft, caps, approved, act }: ActionProps) {
  const mustApprove = needsApproval(draft, approved, caps.canDeviate);
  const hasLines = draft.lines.length > 0;
  const validity = draft.validUntil ? fmtDate(draft.validUntil) : "—";
  return (
    <>
      {mustApprove && (
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!hasLines}
          onClick={() =>
            act(
              requestApproval,
              "Ζητήθηκε Έγκριση. Ειδοποιήθηκαν όσοι «Παρεκκλίνουν από τον Κατάλογο».",
            )
          }
        >
          Αίτημα έγκρισης
        </button>
      )}
      <button
        type="button"
        className="button"
        data-primary={!mustApprove}
        disabled={mustApprove || !hasLines}
        onClick={() =>
          act(
            send,
            `Στάλθηκε: κάθε παραλήπτης πήρε email με τον δικό του Σύνδεσμο πρότασης, ισχύς έως ${validity}.`,
          )
        }
      >
        Αποστολή
      </button>
      {!hasLines && (
        <span className="muted">Πρόσθεσε τουλάχιστον μία γραμμή.</span>
      )}
      {hasLines && mustApprove && (
        <span className="muted">
          Έχει Παρέκκλιση: δεν στέλνεται χωρίς Έγκριση.
        </span>
      )}
    </>
  );
}

function ApprovalActions({ draft, caps, actor, act }: ActionProps) {
  const [comment, setComment] = useState("");
  const since = currentRevision(draft)?.when ?? TODAY;
  if (!caps.canDeviate)
    return (
      <Badge tone="attention">
        Αναμένει Έγκριση · {daysBetween(since, TODAY)} μέρες
      </Badge>
    );
  const hasComment = comment.trim().length > 0;
  return (
    <>
      <input
        className="input grow"
        aria-label="Σχόλιο Εγκριτή"
        placeholder="Σχόλιο (υποχρεωτικό στην απόρριψη)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() =>
          act(
            decide(true, actor, comment.trim()),
            "Εγκρίθηκε και στάλθηκε σε κάθε παραλήπτη.",
            true,
          )
        }
      >
        Εγκρίνω
      </button>
      <button
        type="button"
        className="button"
        data-danger="true"
        disabled={!hasComment}
        onClick={() =>
          act(
            decide(false, actor, comment.trim()),
            "Απορρίφθηκε. Γύρισε στη Σύνταξη με το σχόλιό σου.",
          )
        }
      >
        Απορρίπτω
      </button>
    </>
  );
}

function RevisionButton({ draft, actor, act }: ActionProps) {
  const [isAsking, setIsAsking] = useState(false);
  const next = revisionNumber(draft) + 1;
  const warning =
    draft.path === "Εστάλη"
      ? `Θα γίνει αναθεώρηση ${next} και οι σύνδεσμοι θα ακυρωθούν· αν η αλλαγή προσθέτει ή βαθαίνει Παρέκκλιση θα θέλει νέα Έγκριση.`
      : `Θα γίνει αναθεώρηση ${next} και το αίτημα Έγκρισης αποσύρεται· αν η αλλαγή προσθέτει ή βαθαίνει Παρέκκλιση θα θέλει νέα Έγκριση.`;
  if (!isAsking)
    return (
      <button
        type="button"
        className="button"
        onClick={() => setIsAsking(true)}
      >
        Νέα αναθεώρηση
      </button>
    );
  return (
    <span className="d2-ask">
      <span className="muted">{warning}</span>
      <span className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() =>
            act(
              newRevision(actor),
              `Αναθεώρηση ${next} σε σύνταξη. Τα πεδία άνοιξαν.`,
            )
          }
        >
          Συνέχεια
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setIsAsking(false)}
        >
          Άκυρο
        </button>
      </span>
    </span>
  );
}

function ExpiredActions({ act }: ActionProps) {
  const [days, setDays] = useState<number>(PROPOSAL_VALIDITY_DAYS);
  const [reason, setReason] = useState("");
  return (
    <>
      <span className="btn-row">
        <NumberInput
          label="Μέρες Παράτασης"
          value={days}
          min={1}
          onChange={(v) => setDays(Math.max(1, v))}
          suffix="μέρες"
        />
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() =>
            act(
              extend(days),
              `Παράταση ${days} μερών: νέος σύνδεσμος, ίδιες τιμές, χωρίς Έγκριση.`,
            )
          }
        >
          Παράταση
        </button>
      </span>
      <span className="btn-row">
        <select
          className="select"
          aria-label="Λόγος απώλειας"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Λόγος απώλειας…</option>
          {LOSS_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button
          type="button"
          className="button"
          data-danger="true"
          disabled={!reason}
          onClick={() =>
            act(
              closeLost,
              `Κλείστηκε ως χαμένη · Λόγος απώλειας: ${reason}. Η Ευκαιρία έκλεισε ως Χαμένη.`,
            )
          }
        >
          Κλείσιμο ως χαμένη
        </button>
      </span>
      <span className="muted">
        Η Παράταση δίνει νέο σύνδεσμο με τις ίδιες τιμές, χωρίς Έγκριση.
      </span>
    </>
  );
}

// Οι ενέργειες της πρότασης ανά πορεία. Όποιος δεν συντάσσει βλέπει μόνο την κατάσταση.
export function ProposalActions(props: ActionProps) {
  const { draft, caps, act } = props;
  const [isNewOpportunity, setIsNewOpportunity] = useState(false);
  const isComposer = caps.canCompose;
  switch (draft.path) {
    case "Σύνταξη":
      return isComposer ? <DraftActions {...props} /> : null;
    case "Αναμένει Έγκριση":
      return (
        <>
          {!caps.isReadOnly && <ApprovalActions {...props} />}
          {isComposer && <RevisionButton {...props} />}
        </>
      );
    case "Εστάλη":
      return (
        <>
          {isComposer && <RevisionButton {...props} />}
          {caps.canRecordOutsideSignature && (
            <OutsideSignatureForm draft={draft} act={act} />
          )}
        </>
      );
    case "Έληξε":
      return isComposer ? <ExpiredActions {...props} /> : null;
    case "Χάθηκε":
      if (!isComposer) return null;
      return isNewOpportunity ? (
        <span role="status">
          Άνοιξε νέα Ευκαιρία «{draft.title}», με σύνδεσμο σε αυτήν. Η πρόταση
          αντιγράφηκε ως αφετηρία.
        </span>
      ) : (
        <button
          type="button"
          className="button"
          onClick={() => setIsNewOpportunity(true)}
        >
          Νέα Ευκαιρία από αυτήν
        </button>
      );
    default:
      return null;
  }
}
