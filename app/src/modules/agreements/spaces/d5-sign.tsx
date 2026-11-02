"use client";

import { useState, useTransition, type FormEvent } from "react";

import { requestSigningCode, signProposal } from "../actions-public";
import { deadKindOf } from "../components/dead-link";
import {
  SIGN_LABELS,
  type DeadLinkKind,
  type SignLabels,
} from "../labels-public";
import type { Language, PublicResult } from "../types";
import { D5Done, D5Message } from "./d5-done";

// Η ροή υπογραφής του Υπογράφοντα (prototype `screens/d5-actions.tsx` › SignStep, CodeStep) με τις πραγματικές
// δημόσιες ενέργειες: όνομα + «Αποδέχομαι» → κωδικός 6 ψηφίων → υπογραφή. Ό,τι γράφτηκε μένει αν κάτι αποτύχει.
// Το token και ο κωδικός δεν γράφονται πουθενά· μένουν μόνο στη μνήμη της σελίδας.

interface SignFlowProps {
  token: string;
  language: Language;
  managerName: string | null;
  maskedEmail: string;
  codeChannel: "manual" | "email";
  onDead: (kind: DeadLinkKind) => void;
  onCancel: () => void;
}

const CODE_PATTERN = /^\d{6}$/;
const FAILED: PublicResult = { status: "error" };

const NEW_CODE: Readonly<Record<Language, string>> = {
  el: "Νέος κωδικός",
  en: "New code",
};
const SIGNED_HEAD: Readonly<Record<Language, string>> = {
  el: "Υπογράφηκε.",
  en: "Signed.",
};

const messageFor = (result: PublicResult, t: SignLabels): string => {
  switch (result.status) {
    case "wrong_code":
      return t.wrongCode(result.attemptsLeft);
    case "locked":
      return t.locked;
    case "code_expired":
      return t.codeExpired;
    case "rate_limited":
      return t.rateLimited(result.retryAfter);
    case "invalid_name":
      return t.invalidName;
    case "not_accepted":
      return t.notAccepted;
    case "not_signatory":
      return t.notSignatory;
    default:
      return t.error;
  }
};

// Με χειροκίνητο κωδικό δεν υπόσχεται αντίγραφο ή email: αυτά έρχονται μόνο όταν συνδεθεί ο πάροχος.
function Signed({
  language,
  codeChannel,
}: {
  language: Language;
  codeChannel: "manual" | "email";
}) {
  const t = SIGN_LABELS[language];
  return codeChannel === "email" ? (
    <D5Done text={t.signed} extra={`${t.signedRecord} ${t.signedLocked}`} />
  ) : (
    <D5Done
      text={SIGNED_HEAD[language]}
      extra={`${t.signedRecord} ${t.signedInvite}`}
    />
  );
}

interface NameStepProps {
  t: SignLabels;
  isPending: boolean;
  // Όνομα και «Αποδέχομαι» ζουν στη ροή: μένουν και όταν ο πελάτης ζητήσει νέο κωδικό.
  name: string;
  setName: (name: string) => void;
  isAccepted: boolean;
  setIsAccepted: (isAccepted: boolean) => void;
  onSubmit: (name: string, isAccepted: boolean) => void;
  onCancel: () => void;
}

function NameStep(props: NameStepProps) {
  const { t, isPending, name, setName, isAccepted, setIsAccepted } = props;
  const { onSubmit, onCancel } = props;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(name, isAccepted);
  };
  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="stack">
        <span>{t.fullName}</span>
        <input
          className="input"
          name="signerName"
          autoComplete="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={isAccepted}
          onChange={(e) => setIsAccepted(e.target.checked)}
        />{" "}
        {t.accept}
      </label>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending || name.trim() === "" || !isAccepted}
        >
          {t.continue}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

interface CodeStepProps {
  t: SignLabels;
  intro: string;
  isPending: boolean;
  newCodeLabel: string | null;
  onSubmit: (code: string) => void;
  onNewCode: () => void;
  onCancel: () => void;
}

function CodeStep(props: CodeStepProps) {
  const { t, isPending, newCodeLabel } = props;
  const [code, setCode] = useState("");
  const stripped = code.replace(/\s/g, "");
  const isValid = CODE_PATTERN.test(stripped);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) props.onSubmit(stripped);
  };
  return (
    <form className="stack" onSubmit={handleSubmit}>
      <p className="muted">{props.intro}</p>
      <label className="stack">
        <span>{t.code}</span>
        <input
          className="input"
          name="signingCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      {/\D/.test(stripped) && <p className="muted">{t.codeInvalid}</p>}
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending || !isValid}
        >
          {t.confirm}
        </button>
        {newCodeLabel ? (
          <button type="button" className="button" onClick={props.onNewCode}>
            {newCodeLabel}
          </button>
        ) : (
          <button type="button" className="button" onClick={props.onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  );
}

type Step = "name" | "code" | "done";

export function D5SignFlow(props: SignFlowProps) {
  const { token, language, onDead } = props;
  const t = SIGN_LABELS[language];
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (
    call: () => Promise<PublicResult>,
    onResult: (r: PublicResult) => void,
  ) => {
    setMessage(null);
    startTransition(async () => {
      // Αποτυχία δικτύου: το λάθος φαίνεται και ό,τι έγραψε ο πελάτης μένει.
      onResult(await call().catch(() => FAILED));
    });
  };

  const handleRequest = (name: string, accepted: boolean) =>
    run(
      () => requestSigningCode({ token, name, accepted }),
      (result) => {
        const dead = deadKindOf(result);
        if (dead) return onDead(dead);
        if (result.status !== "sent") return setMessage(messageFor(result, t));
        setNeedsNewCode(false);
        setStep("code");
      },
    );

  const handleSign = (code: string) =>
    run(
      () => signProposal({ token, code }),
      (result) => {
        // «signed» από την υπογραφή είναι επιτυχία, όχι νεκρός Σύνδεσμος.
        if (result.status === "signed") return setStep("done");
        const dead = deadKindOf(result);
        if (dead) return onDead(dead);
        setMessage(messageFor(result, t));
        setNeedsNewCode(
          result.status === "locked" || result.status === "code_expired",
        );
      },
    );

  const handleNewCode = () => {
    setMessage(null);
    setNeedsNewCode(false);
    setStep("name");
  };

  if (step === "done")
    return <Signed language={language} codeChannel={props.codeChannel} />;
  return (
    <div className="stack">
      {step === "name" ? (
        <NameStep
          t={t}
          isPending={isPending}
          name={name}
          setName={setName}
          isAccepted={isAccepted}
          setIsAccepted={setIsAccepted}
          onSubmit={handleRequest}
          onCancel={props.onCancel}
        />
      ) : (
        <CodeStep
          t={t}
          intro={
            props.codeChannel === "email"
              ? t.codeStepEmail(props.maskedEmail)
              : t.codeStepManual(props.managerName)
          }
          isPending={isPending}
          newCodeLabel={needsNewCode ? NEW_CODE[language] : null}
          onSubmit={handleSign}
          onNewCode={handleNewCode}
          onCancel={props.onCancel}
        />
      )}
      {message && <D5Message text={message} />}
    </div>
  );
}
