"use client";

import { useState, useTransition, type FormEvent } from "react";

import { declineProposal, requestChanges } from "../actions-public";
import { deadKindOf } from "../components/dead-link";
import {
  SIGN_LABELS,
  type DeadLinkKind,
  type SignLabels,
} from "../labels-public";
import type { Language, PublicResult } from "../types";
import { D5Done, D5Message } from "./d5-done";

// «Θέλω αλλαγές» (κάθε παραλήπτης) και «Απόρριψη» (ο Υπογράφων) στη μορφή του prototype (`screens/d5-actions.tsx` ›
// TextStep), με τις πραγματικές δημόσιες ενέργειες· χωρίς token σε διεύθυνση ή αποθήκευση.

interface PublicFormProps {
  token: string;
  language: Language;
  onDead: (kind: DeadLinkKind) => void;
  onCancel: () => void;
}

type Outcome =
  { kind: "none" } | { kind: "done" } | { kind: "error"; text: string };

const errorFor = (result: PublicResult, t: SignLabels): string => {
  switch (result.status) {
    case "invalid_message":
      return t.invalidMessage;
    case "rate_limited":
      return t.tooManyRequests(result.retryAfter);
    case "not_signatory":
      return t.notSignatory;
    default:
      return t.error;
  }
};

function useSubmit(options: {
  t: SignLabels;
  isSuccess: (result: PublicResult) => boolean;
  onDead: (kind: DeadLinkKind) => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "none" });
  const [isPending, startTransition] = useTransition();
  const submit = (
    run: () => Promise<PublicResult>,
    onSuccess: () => void = () => undefined,
  ) => {
    setOutcome({ kind: "none" });
    startTransition(async () => {
      // Μια ενέργεια που απέτυχε στο δίκτυο δεν ρίχνει τη σελίδα· ό,τι έγραψε ο πελάτης μένει.
      const result = await run().catch((): PublicResult => ({
        status: "error",
      }));
      const dead = deadKindOf(result);
      if (dead) return options.onDead(dead);
      if (options.isSuccess(result)) {
        setOutcome({ kind: "done" });
        return onSuccess();
      }
      setOutcome({ kind: "error", text: errorFor(result, options.t) });
    });
  };
  return { outcome, isPending, submit };
}

interface TextStepProps {
  label: string;
  name: string;
  maxLength: number;
  isRequired: boolean;
  isDanger: boolean;
  submitLabel: string;
  cancelLabel: string;
  isPending: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function TextStep(props: TextStepProps) {
  const { isDanger, isRequired, value } = props;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="stack">
        <span>{props.label}</span>
        <textarea
          className="input"
          rows={4}
          name={props.name}
          required={isRequired}
          maxLength={props.maxLength}
          value={value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </label>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary={isDanger ? undefined : "true"}
          data-danger={isDanger ? "true" : undefined}
          disabled={props.isPending || (isRequired && value.trim() === "")}
        >
          {props.submitLabel}
        </button>
        <button type="button" className="button" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
      </div>
    </form>
  );
}

export function D5ChangesForm({
  token,
  language,
  onDead,
  onCancel,
}: PublicFormProps) {
  const t = SIGN_LABELS[language];
  const [message, setMessage] = useState("");
  const { outcome, isPending, submit } = useSubmit({
    t,
    isSuccess: (result) => result.status === "ok",
    onDead,
  });
  return (
    <div className="stack">
      <TextStep
        label={t.changesPrompt}
        name="message"
        maxLength={2000}
        isRequired
        isDanger={false}
        submitLabel={t.send}
        cancelLabel={t.cancel}
        isPending={isPending}
        value={message}
        onChange={setMessage}
        onSubmit={() =>
          submit(
            () => requestChanges({ token, message }),
            () => setMessage(""),
          )
        }
        onCancel={onCancel}
      />
      {outcome.kind === "done" && <D5Done text={t.changesSent} />}
      {outcome.kind === "error" && <D5Message text={outcome.text} />}
    </div>
  );
}

export function D5DeclineForm({
  token,
  language,
  onDead,
  onCancel,
}: PublicFormProps) {
  const t = SIGN_LABELS[language];
  const [reason, setReason] = useState("");
  const { outcome, isPending, submit } = useSubmit({
    t,
    isSuccess: (result) => result.status === "declined",
    onDead,
  });
  if (outcome.kind === "done") return <D5Done text={t.rejected} />;
  return (
    <div className="stack">
      <TextStep
        label={t.rejectReason}
        name="reason"
        maxLength={1000}
        isRequired={false}
        isDanger
        submitLabel={t.rejectConfirm}
        cancelLabel={t.cancel}
        isPending={isPending}
        value={reason}
        onChange={setReason}
        onSubmit={() => submit(() => declineProposal({ token, reason }))}
        onCancel={onCancel}
      />
      {outcome.kind === "error" && <D5Message text={outcome.text} />}
    </div>
  );
}
