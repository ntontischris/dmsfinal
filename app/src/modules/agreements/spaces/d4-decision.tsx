"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { initialsOf } from "@/spaces/shell/avatar";

import { decideApproval } from "../actions-flow";
import type { ApprovalItem } from "../types";
import { StatusTag } from "./d1-status-tag";

export type Form = "approve" | "reject";
export type Decision = { form: Form; comment: string };

// «Εγκρίνω» / «Απορρίπτω» με την πραγματική ενέργεια· το σχόλιο είναι υποχρεωτικό μόνο στην Απόρριψη.
export function DecisionForm({
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
    <form ref={formRef} className="stack d4l-form" onSubmit={onSubmit}>
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

// Η απάντηση σε μια πρόταση μένει στη θέση της ως γραμμή, και όταν η πρόταση φύγει από την ουρά.
export function ResultLine({
  item,
  decision,
}: {
  item: ApprovalItem;
  decision: Decision;
}) {
  const isApproved = decision.form === "approve";
  const owner = item.managerName ?? "ο Υπεύθυνος";
  return (
    <section className="d4-result" role="status">
      <div className="ml-line">
        <span className="ml-thumb" aria-hidden="true">
          {initialsOf(item.clientName)}
        </span>
        <span className="ml-main">
          <StatusTag
            label={isApproved ? "εγκρίθηκε" : "απορρίφθηκε"}
            tone={isApproved ? undefined : "urgent"}
          />
          <strong>
            {item.clientName} · {item.title} · αναθεώρηση {item.revision}
            {decision.comment && ` · «${decision.comment}»`}
          </strong>
          <small>
            {isApproved
              ? `Εγκρίθηκε και στάλθηκε σε όλους τους παραλήπτες· ειδοποιήθηκε ο/η ${owner}.`
              : `Ειδοποιήθηκε ο/η ${owner}. Αναθεωρεί και ξαναζητά Έγκριση.`}
          </small>
        </span>
      </div>
    </section>
  );
}
