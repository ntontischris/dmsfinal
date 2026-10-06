"use client";

import { useState } from "react";

import type { ActionLabels } from "@/screens/d5-labels";

// Επιλογές του Συνδέσμου: υπογραφή και απόρριψη μόνο ο Υπογράφων, «Θέλω αλλαγές» όλοι.
type Mode =
  | "idle"
  | "sign"
  | "code"
  | "signed"
  | "changes"
  | "changesSent"
  | "reject"
  | "rejected";

const PROTOTYPE_NOTE = "prototype: δεν αποθηκεύεται";

interface ProposalActionsProps {
  isSignatory: boolean;
  signatoryName: string;
  signatoryEmail: string;
  a: ActionLabels;
}

// Κρύβει το email όπως στο μήνυμα κωδικού: m•••@example.com.
const maskEmail = (email: string): string => {
  const [user, domain] = email.split("@");
  return domain ? `${user.slice(0, 1)}•••@${domain}` : email;
};

function Done({ text, extra }: { text: string; extra?: string }) {
  return (
    <div className="d5-done" role="status">
      <p>
        <strong>{text}</strong>
      </p>
      {extra && <p className="muted">{extra}</p>}
      <p className="muted">({PROTOTYPE_NOTE})</p>
    </div>
  );
}

interface StepProps {
  a: ActionLabels;
  onCancel: () => void;
}

function SignStep({ a, onCancel, onNext }: StepProps & { onNext: () => void }) {
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="stack">
      <label className="stack">
        {a.fullName}
        <input
          className="input"
          value={name}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />{" "}
        {a.accept}
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!name.trim() || !accepted}
          onClick={onNext}
        >
          {a.sendCode}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          {a.cancel}
        </button>
      </div>
    </div>
  );
}

function CodeStep({
  a,
  onCancel,
  onNext,
  email,
}: StepProps & { onNext: () => void; email: string }) {
  const [code, setCode] = useState("");
  return (
    <div className="stack">
      <p className="muted">{a.codeSent(maskEmail(email))}</p>
      <label className="stack">
        {a.code}
        <input
          className="input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!/^\d{6}$/.test(code)}
          onClick={onNext}
        >
          {a.confirm}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          {a.cancel}
        </button>
      </div>
    </div>
  );
}

function TextStep({
  a,
  onCancel,
  onNext,
  label,
  submit,
  isRequired,
  isDanger,
}: StepProps & {
  onNext: () => void;
  label: string;
  submit: string;
  isRequired: boolean;
  isDanger: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="stack">
      <label className="stack">
        {label}
        <textarea
          className="input"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary={!isDanger}
          data-danger={isDanger}
          disabled={isRequired && !text.trim()}
          onClick={onNext}
        >
          {submit}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          {a.cancel}
        </button>
      </div>
    </div>
  );
}

function Choices({
  a,
  isSignatory,
  setMode,
}: {
  a: ActionLabels;
  isSignatory: boolean;
  setMode: (mode: Mode) => void;
}) {
  return (
    <div className="btn-row">
      {isSignatory && (
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() => setMode("sign")}
        >
          {a.sign}
        </button>
      )}
      <button
        type="button"
        className="button"
        onClick={() => setMode("changes")}
      >
        {a.requestChanges}
      </button>
      {isSignatory && (
        <button
          type="button"
          className="button"
          data-danger="true"
          onClick={() => setMode("reject")}
        >
          {a.reject}
        </button>
      )}
    </div>
  );
}

export function ProposalActions({
  isSignatory,
  signatoryName,
  signatoryEmail,
  a,
}: ProposalActionsProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const idle = () => setMode("idle");

  if (mode === "signed") return <Done text={a.signed} extra={a.signedRecord} />;
  if (mode === "rejected") return <Done text={a.rejected} />;
  if (mode === "sign")
    return <SignStep a={a} onCancel={idle} onNext={() => setMode("code")} />;
  if (mode === "code")
    return (
      <CodeStep
        a={a}
        email={signatoryEmail}
        onCancel={idle}
        onNext={() => setMode("signed")}
      />
    );
  if (mode === "changes")
    return (
      <TextStep
        a={a}
        label={a.changesPrompt}
        submit={a.send}
        isRequired
        isDanger={false}
        onCancel={idle}
        onNext={() => setMode("changesSent")}
      />
    );
  if (mode === "reject")
    return (
      <TextStep
        a={a}
        label={a.rejectReason}
        submit={a.rejectConfirm}
        isRequired={false}
        isDanger
        onCancel={idle}
        onNext={() => setMode("rejected")}
      />
    );

  return (
    <div className="stack">
      {mode === "changesSent" && <Done text={a.changesSent} />}
      {!isSignatory && <p className="note">{a.onlySignatory(signatoryName)}</p>}
      <Choices a={a} isSignatory={isSignatory} setMode={setMode} />
    </div>
  );
}
