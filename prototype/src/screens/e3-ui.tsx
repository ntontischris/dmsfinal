"use client";

import { useState } from "react";

interface ReasonFormProps {
  label: string;
  confirmLabel: string;
  isDanger?: boolean;
  isOptional?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// Φόρμα με λόγο (υποχρεωτικό, εκτός αν isOptional): ίδιο σχήμα για απόρριψη, ακύρωση, αναίρεση.
export function ReasonForm({
  label,
  confirmLabel,
  isDanger,
  isOptional = false,
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
          disabled={!isValid}
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

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="e3-warn" role="status">
      {children}
    </p>
  );
}
