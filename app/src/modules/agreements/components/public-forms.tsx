"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

import { declineProposal, requestChanges } from "../actions-public";
import {
  SIGN_LABELS,
  type DeadLinkKind,
  type SignLabels,
} from "../labels-public";
import type { Language, PublicResult } from "../types";

import { deadKindOf } from "./dead-link";

// «Θέλω αλλαγές» (κάθε παραλήπτης) και «Απόρριψη» (ο Υπογράφων) της D5. Όπως η ροή υπογραφής:
// δικό τους state και απευθείας κλήση των δημόσιων ενεργειών, χωρίς token σε διεύθυνση ή αποθήκευση.

interface PublicFormProps {
  token: string;
  language: Language;
  onDead: (kind: DeadLinkKind) => void;
  onCancel: () => void;
}

const TEXTAREA =
  "min-h-24 w-full min-w-0 rounded-sm border border-input bg-background px-3 py-1.5 text-sm leading-snug text-foreground hover:border-border-strong focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

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

// Κοινή ροή: καθαρίζει το αποτέλεσμα, καλεί την ενέργεια και διαλέγει ανάμεσα σε νεκρό Σύνδεσμο, επιτυχία και λάθος.
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
      // Μια ενέργεια που απέτυχε στο δίκτυο δεν πρέπει να ρίξει τη σελίδα· ό,τι έγραψε ο πελάτης μένει.
      const result = await run().catch(
        (): PublicResult => ({ status: "error" }),
      );
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

function ResultMessage({ outcome, done }: { outcome: Outcome; done: string }) {
  if (outcome.kind === "done")
    return (
      <p
        role="status"
        className="m-0 rounded-sm border bg-muted px-3 py-2 text-sm"
      >
        {done}
      </p>
    );
  if (outcome.kind === "error")
    return (
      <p role="alert" className="m-0 text-sm text-destructive">
        {outcome.text}
      </p>
    );
  return null;
}

export function ChangesForm({
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(
      () => requestChanges({ token, message }),
      () => setMessage(""),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <Field label={t.changesPrompt}>
        <textarea
          name="message"
          required
          maxLength={2000}
          className={TEXTAREA}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={isPending || message.trim() === ""}
        >
          {t.send}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
      <ResultMessage outcome={outcome} done={t.changesSent} />
    </form>
  );
}

export function DeclineForm({
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(() => declineProposal({ token, reason }));
  };

  if (outcome.kind === "done")
    return <ResultMessage outcome={outcome} done={t.rejected} />;
  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <Field label={t.rejectReason}>
        <textarea
          name="reason"
          maxLength={1000}
          className={TEXTAREA}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" disabled={isPending}>
          {t.rejectConfirm}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
      <ResultMessage outcome={outcome} done={t.rejected} />
    </form>
  );
}
