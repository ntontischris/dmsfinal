"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { requestSigningCode, signProposal } from "../actions-public";
import {
  SIGN_LABELS,
  type DeadLinkKind,
  type SignLabels,
} from "../labels-public";
import type { Language, PublicResult } from "../types";

import { deadKindOf } from "./dead-link";

// Η ροή υπογραφής του Υπογράφοντα (D5): όνομα + «Αποδέχομαι» → κωδικός 6 ψηφίων → υπογραφή.
// Ζει σε δικό της state (όχι <form action>) ώστε ό,τι έγραψε να μένει όταν κάτι αποτύχει.
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

type Step = "name" | "code" | "done";

const CODE_PATTERN = /^\d{6}$/;

const NEW_CODE: Readonly<Record<Language, string>> = {
  el: "Νέος κωδικός",
  en: "New code",
};
const SIGNED_HEAD: Readonly<Record<Language, string>> = {
  el: "Υπογράφηκε.",
  en: "Signed.",
};

// Αποτέλεσμα που δεν αφορά το τρέχον βήμα: το κείμενό του στη γλώσσα του πελάτη.
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

function SignedMessage({
  t,
  language,
  codeChannel,
}: {
  t: SignLabels;
  language: Language;
  codeChannel: "manual" | "email";
}) {
  // Με χειροκίνητο κωδικό δεν υπόσχεται αντίγραφο ή email: αυτά έρχονται μόνο όταν συνδεθεί ο πάροχος.
  const text =
    codeChannel === "email"
      ? `${t.signed} ${t.signedRecord} ${t.signedLocked}`
      : `${SIGNED_HEAD[language]} ${t.signedRecord} ${t.signedInvite}`;
  return (
    <p
      role="status"
      className="m-0 rounded-sm border bg-muted px-3 py-2 text-sm"
    >
      {text}
    </p>
  );
}

export function SignFlow({
  token,
  language,
  managerName,
  maskedEmail,
  codeChannel,
  onDead,
  onCancel,
}: SignFlowProps) {
  const t = SIGN_LABELS[language];
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const strippedCode = code.replace(/\s/g, "");
  const isValidCode = CODE_PATTERN.test(strippedCode);
  const showsCodeHint = /\D/.test(strippedCode);

  const failed: PublicResult = { status: "error" };

  const finish = (result: PublicResult, onOk: () => void) => {
    const dead = deadKindOf(result);
    if (dead) return onDead(dead);
    onOk();
  };

  const handleRequest = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      // Αποτυχία δικτύου: το λάθος φαίνεται και ό,τι έγραψε ο πελάτης μένει.
      const result = await requestSigningCode({
        token,
        name,
        accepted: isAccepted,
      }).catch(() => failed);
      finish(result, () => {
        if (result.status === "sent") {
          setNeedsNewCode(false);
          setStep("code");
          return;
        }
        setMessage(messageFor(result, t));
      });
    });
  };

  const handleSign = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidCode) return;
    setMessage(null);
    startTransition(async () => {
      const result = await signProposal({
        token,
        code: strippedCode,
      }).catch(() => failed);
      // «signed» από την υπογραφή είναι επιτυχία, όχι νεκρός Σύνδεσμος.
      if (result.status === "signed") {
        setStep("done");
        return;
      }
      finish(result, () => {
        setMessage(messageFor(result, t));
        setNeedsNewCode(
          result.status === "locked" || result.status === "code_expired",
        );
      });
    });
  };

  const handleNewCode = () => {
    setCode("");
    setMessage(null);
    setNeedsNewCode(false);
    setStep("name");
  };

  if (step === "done")
    return (
      <SignedMessage t={t} language={language} codeChannel={codeChannel} />
    );

  return (
    <div className="grid gap-3">
      {step === "name" ? (
        <form onSubmit={handleRequest} className="grid gap-3">
          <Field label={t.fullName}>
            <Input
              name="signerName"
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(event) => setIsAccepted(event.target.checked)}
              className="mt-1 accent-primary"
            />
            <span>{t.accept}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || name.trim() === "" || !isAccepted}
            >
              {t.continue}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSign} className="grid gap-3">
          <p className="m-0 text-sm">
            {codeChannel === "email"
              ? t.codeStepEmail(maskedEmail)
              : t.codeStepManual(managerName)}
          </p>
          <Field label={t.code}>
            <Input
              name="signingCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={7}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          {showsCodeHint && (
            <p className="m-0 text-sm text-muted-foreground">
              {t.codeInvalid}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || !isValidCode}
            >
              {t.confirm}
            </Button>
            {needsNewCode ? (
              <Button type="button" onClick={handleNewCode}>
                {NEW_CODE[language]}
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onCancel}>
                {t.cancel}
              </Button>
            )}
          </div>
        </form>
      )}
      {message && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
