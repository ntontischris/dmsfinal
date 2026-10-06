"use client";

import { useState, type ReactNode } from "react";

import type { LinkHost } from "@/data/deliverables";
import { LINK_ERROR, hostOf } from "@/screens/h2-model";

interface LinkFormProps {
  label: string;
  confirmLabel: string;
  onSubmit: (link: string, host: LinkHost) => void;
  onClose: () => void;
}

// Μόνο link Google Drive, Vimeo ή YouTube (κανόνας 2): ίδια φόρμα για νέα Έκδοση, διόρθωση και Τελικά αρχεία.
export function LinkForm({
  label,
  confirmLabel,
  onSubmit,
  onClose,
}: LinkFormProps) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const host = hostOf(link);
    if (!host) return setError(LINK_ERROR);
    onSubmit(link.trim(), host);
  };
  return (
    <div className="h2-form">
      <label>
        {label}
        <input
          className="input"
          type="url"
          value={link}
          placeholder="https://"
          onChange={(event) => {
            setLink(event.target.value);
            setError("");
          }}
        />
      </label>
      <span className="muted">
        Βεβαιώσου ότι ανοίγει σε όποιον έχει τον σύνδεσμο.
      </span>
      {error && (
        <span className="h2-error" role="alert">
          {error}
        </span>
      )}
      <div className="btn-row">
        <button type="button" className="button" data-primary onClick={submit}>
          {confirmLabel}
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
      <span className="muted">(prototype: δεν αποθηκεύεται)</span>
    </div>
  );
}

interface ReasonFormProps {
  label: string;
  confirmLabel: string;
  isDanger?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  extra?: ReactNode;
}

export function ReasonForm({
  label,
  confirmLabel,
  isDanger,
  onConfirm,
  onClose,
  extra,
}: ReasonFormProps) {
  const [reason, setReason] = useState("");
  const isValid = reason.trim().length > 0;
  return (
    <div className="h2-form">
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
      {extra}
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
