"use client";

import Link from "next/link";
import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Entity, Person } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import { decideApproval } from "../actions-flow";
import { describeDeviation, formatDate, formatMoney } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { ApprovalItem } from "../types";
import { ItemRows } from "./lane-rows";

import "./d4.css";

type Form = "approve" | "reject";
type Decision = { form: Form; comment: string };

const DEVIATION_LABEL = {
  new: "νέα",
  deeper: "βαθύτερη",
  covered: "ήδη εγκρίθηκε",
} as const;

function LinesTable({ item }: { item: ApprovalItem }) {
  const suffix = item.kind === "monthly" ? " / μήνα" : "";
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Γραμμή</th>
          <th className="num">Κατάλογος</th>
          <th className="num">Πρόταση</th>
        </tr>
      </thead>
      <tbody>
        {item.lines.map((line, index) => (
          <tr key={`${line.description}-${index}`}>
            <td data-label="Γραμμή">
              {line.quantity > 1
                ? `${line.quantity} × ${line.description}`
                : line.description}
            </td>
            <td data-label="Κατάλογος" className="num">
              {line.isFree || line.catalogPrice === null
                ? "ελεύθερη γραμμή"
                : `${formatMoney(line.catalogPrice)}${suffix}`}
            </td>
            <td data-label="Πρόταση" className="num">
              {line.unitPrice === null ? (
                "—"
              ) : line.isBelow ? (
                <strong>{`${formatMoney(line.unitPrice)}${suffix}`}</strong>
              ) : (
                `${formatMoney(line.unitPrice)}${suffix}`
              )}
              {line.isBelow && " ↓"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// «Εγκρίνω» / «Απορρίπτω» με την πραγματική ενέργεια· το σχόλιο είναι υποχρεωτικό μόνο στην Απόρριψη.
function DecisionForm({
  agreementId,
  form,
  onCancel,
  onDone,
}: {
  agreementId: string;
  form: Form;
  onCancel: () => void;
  onDone: (comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    async (previous, data: FormData) => {
      const next = await decideApproval(previous, data);
      if (next.notice) onDone(comment.trim());
      return next;
    },
  );
  const isReject = form === "reject";
  return (
    <form ref={formRef} className="stack" onSubmit={onSubmit}>
      <input type="hidden" name="agreementId" value={agreementId} />
      <input type="hidden" name="decision" value={form} />
      <label className="stack">
        {isReject
          ? "Σχόλιο (υποχρεωτικό: τι να αλλάξει)"
          : "Σχόλιο (προαιρετικό)"}
        <textarea
          className="input"
          name="comment"
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      {state.error && (
        <ul className="note" role="alert">
          <li>{state.error}</li>
        </ul>
      )}
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary={!isReject}
          data-danger={isReject}
          disabled={isPending || (isReject && !comment.trim())}
        >
          {isReject ? "Απορρίπτω" : "Εγκρίνω"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </form>
  );
}

function ResultLine({
  item,
  decision,
}: {
  item: ApprovalItem;
  decision: { form: Form; comment: string };
}) {
  const isApproved = decision.form === "approve";
  const owner = item.managerName ?? "ο Υπεύθυνος";
  return (
    <section className="card d4-result" role="status">
      <Badge tone={isApproved ? "strong" : "attention"}>
        {isApproved ? "εγκρίθηκε" : "απορρίφθηκε"}
      </Badge>
      <p>
        <strong>{item.clientName}</strong> · {item.title} · αναθεώρηση{" "}
        {item.revision}
        {decision.comment && ` · «${decision.comment}»`}
      </p>
      <p className="muted">
        {isApproved
          ? `Εγκρίθηκε και στάλθηκε σε όλους τους παραλήπτες· ειδοποιήθηκε ο/η ${owner}.`
          : `Ειδοποιήθηκε ο/η ${owner}. Αναθεωρεί και ξαναζητά Έγκριση.`}
      </p>
    </section>
  );
}

function ItemHeader({ item, href }: { item: ApprovalItem; href: string }) {
  return (
    <>
      <div className="card-title">
        <Entity
          name={item.clientName}
          sub={
            <Link className="part-title" href={href}>
              {item.title}
            </Link>
          }
        />
        <span className="btn-row">
          <Badge>{KIND_LABELS[item.kind]}</Badge>
          <Badge>Αναθεώρηση {item.revision}</Badge>
          <Badge tone="attention">Αναμένει · {item.pendingDays} μέρες</Badge>
          {item.isReminderDue && (
            <Badge>ξαναειδοποιήθηκαν όσοι εγκρίνουν</Badge>
          )}
          {item.isLowMargin === true && (
            <Badge tone="attention">χαμηλό περιθώριο (δεν θέλει Έγκριση)</Badge>
          )}
        </span>
      </div>
      <p className="part-sub">
        Υπεύθυνος: {item.managerName ? <Person name={item.managerName} /> : "—"}
      </p>
    </>
  );
}

function PreviousApproval({
  item,
  canSeeAmounts,
}: {
  item: ApprovalItem;
  canSeeAmounts: boolean;
}) {
  const previous = item.previous;
  if (previous === null) return null;
  return (
    <div className="note">
      <p>
        Η αναθεώρηση {previous.revision} εγκρίθηκε
        {previous.decidedByName && ` από ${previous.decidedByName}`}
        {previous.decidedAt && ` στις ${formatDate(previous.decidedAt)}`}
        {previous.comment && `: «${previous.comment}»`}. Η Έγκριση δένεται με
        εκείνη την αναθεώρηση· η νέα βαθαίνει την Παρέκκλιση:
      </p>
      <ul className="d5-plain">
        {item.deviations.map((deviation) => (
          <li key={deviation.key}>
            <strong>{DEVIATION_LABEL[deviation.status]}:</strong>{" "}
            {describeDeviation(deviation, canSeeAmounts)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApprovalCard({
  item,
  canSeeAmounts,
  onDecided,
}: {
  item: ApprovalItem;
  canSeeAmounts: boolean;
  onDecided: (decision: Decision) => void;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const href = hrefOf("D2", { id: item.agreementId });
  return (
    <section className="card">
      <ItemHeader item={item} href={href} />
      <h3>Παρέκκλιση</h3>
      <ItemRows
        isInset
        items={item.deviations.map((deviation) => ({
          id: deviation.key,
          title: describeDeviation(deviation, canSeeAmounts),
          isHighlighted: deviation.status !== "covered",
        }))}
      />
      {item.lines.length > 0 && <LinesTable item={item} />}
      {item.total !== null && (
        <p>
          <strong>
            Σύνολο {formatMoney(item.total)}
            {item.kind === "monthly" ? " / μήνα" : " εφάπαξ"}
          </strong>
        </p>
      )}
      <PreviousApproval item={item} canSeeAmounts={canSeeAmounts} />
      {form ? (
        <DecisionForm
          agreementId={item.agreementId}
          form={form}
          onCancel={() => setForm(null)}
          onDone={(comment) => onDecided({ form, comment })}
        />
      ) : (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setForm("approve")}
          >
            Εγκρίνω
          </button>
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setForm("reject")}
          >
            Απορρίπτω
          </button>
          <Link className="button" href={href}>
            Άνοιγμα για αλλαγές
          </Link>
        </div>
      )}
    </section>
  );
}

// Η ουρά Εγκρίσεων (prototype `screens/d4-queue.tsx`) πάνω στις πραγματικές προτάσεις. Το αποτέλεσμα μιας απόφασης μένει
// στη θέση του και όταν η πρόταση φεύγει από τη λίστα.
export function ApprovalQueue({
  items,
  canSeeAmounts,
}: {
  items: readonly ApprovalItem[];
  canSeeAmounts: boolean;
}) {
  const [decided, setDecided] = useState<
    readonly { item: ApprovalItem; decision: Decision }[]
  >([]);
  const waiting = items.filter(
    (item) => !decided.some((done) => done.item.agreementId === item.agreementId),
  );
  return (
    <>
      {decided.map(({ item, decision }) => (
        <ResultLine key={item.agreementId} item={item} decision={decision} />
      ))}
      <p className="muted">
        {waiting.length === 1
          ? "1 πρόταση περιμένει"
          : `${waiting.length} προτάσεις περιμένουν`}{" "}
        Έγκριση. Η Έγκριση δεν λήγει ποτέ· μένει εδώ μέχρι να απαντήσει κάποιος.
      </p>
      {waiting.map((item) => (
        <ApprovalCard
          key={item.agreementId}
          item={item}
          canSeeAmounts={canSeeAmounts}
          onDecided={(decision) =>
            setDecided((done) => [...done, { item, decision }])
          }
        />
      ))}
    </>
  );
}
