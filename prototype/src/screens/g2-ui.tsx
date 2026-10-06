"use client";

import { useState } from "react";

interface ReasonFormProps {
  label: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// Φόρμα με υποχρεωτικό λόγο: ίδιο σχήμα για παράδοση χειροκίνητα και ακύρωση.
export function ReasonForm({
  label,
  confirmLabel,
  isDanger,
  onConfirm,
  onClose,
}: ReasonFormProps) {
  const [reason, setReason] = useState("");
  const isValid = reason.trim().length > 0;
  return (
    <div className="g2-form">
      <label>
        {label}
        <input
          className="input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-required
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
