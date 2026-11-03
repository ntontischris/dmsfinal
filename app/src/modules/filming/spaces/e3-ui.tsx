"use client";

import { useState, type ReactNode } from "react";

import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import type { StatusLook } from "./e1-groups";

import "./e3.css";

// Κοινά κομμάτια της σελίδας Γυρίσματος (prototype `screens/e3-ui.tsx`), που τα μοιράζονται και τα E6 και F2.

const LOOK_TONE: Readonly<Record<StatusLook["tone"], BadgeTone | undefined>> = {
  problem: "attention",
  pending: "waiting",
  action: "strong",
  neutral: undefined,
  ok: "ok",
  muted: "faded",
};

// Η κατάσταση ενός Γυρίσματος ως χάπι (ίδιο σχήμα με τη λίστα Γυρισμάτων).
export function StatusBadge({ look }: { look: StatusLook }) {
  return <Badge tone={LOOK_TONE[look.tone]}>{look.label}</Badge>;
}

interface ReasonFormProps {
  label: string;
  confirmLabel: string;
  isDanger?: boolean;
  isOptional?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// Φόρμα με λόγο (υποχρεωτικό, εκτός αν isOptional): ίδιο σχήμα για απόρριψη, ακύρωση, αναίρεση.
export function ReasonForm({
  label,
  confirmLabel,
  isDanger,
  isOptional = false,
  isPending = false,
  onConfirm,
  onClose,
}: ReasonFormProps) {
  const [reason, setReason] = useState("");
  const isValid = isOptional || reason.trim().length > 0;
  return (
    <div className="stack e3-form">
      <label>
        {label}
        <input
          className="input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-required={!isOptional}
        />
      </label>
      {!isValid && <span className="muted">Ο λόγος είναι υποχρεωτικός.</span>}
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger={isDanger}
          disabled={!isValid || isPending}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="e3-warn" role="status">
      {children}
    </p>
  );
}

// Το τελευταίο που έγινε στη σελίδα, δίπλα στα κουμπιά: τι άλλαξε και ποιος ενημερώθηκε.
// `tone` = error όταν η βάση αρνήθηκε (στο prototype δεν αποτύγχανε τίποτα).
export function LastDone({
  log,
  tone = "ok",
}: {
  log: readonly string[];
  tone?: "ok" | "error";
}) {
  const last = log.at(-1);
  return (
    <p
      className="feedback-msg e3-status"
      data-tone={tone}
      data-shown={!!last}
      role="status"
      aria-live="polite"
    >
      {last && (
        <>
          <span aria-hidden="true">{tone === "ok" ? "✓" : "!"}</span> {last}
        </>
      )}
    </p>
  );
}
