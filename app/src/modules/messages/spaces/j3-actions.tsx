"use client";

import { useCallback, useState } from "react";

import { deleteMessage, editMessage } from "../actions";
import { DELETE_WARNING } from "../labels";
import type { J2Message } from "./j2-adapter";
import { JForm } from "./j2-form";

type Mode = null | "edit" | "delete";

// Οι ενέργειες του πελάτη στο δικό του Μήνυμα (prototype `screens/j3-thread.tsx`): Διόρθωση και Διαγραφή, στα πραγματικά
// server actions. Ένα Μήνυμα που έγινε Αίτημα δεν διαγράφεται.
export function ClientMessageActions({ message }: { message: J2Message }) {
  const [mode, setMode] = useState<Mode>(null);
  const close = useCallback(() => setMode(null), []);
  const toggle = (next: Mode) => setMode(mode === next ? null : next);
  if (message.isDeleted) return null;
  if (!message.canEdit && !message.canDelete && !message.isOwnRequest)
    return null;
  return (
    <div className="stack">
      <div className="btn-row">
        {message.canEdit && (
          <button type="button" onClick={() => toggle("edit")}>
            Διόρθωση
          </button>
        )}
        {message.canDelete && (
          <button type="button" onClick={() => toggle("delete")}>
            Διαγραφή
          </button>
        )}
        {message.isOwnRequest && (
          <span className="muted">
            Το Μήνυμα έγινε Αίτημα και δεν διαγράφεται.
          </span>
        )}
      </div>
      {mode === "edit" && (
        <JForm
          action={editMessage}
          className="j3-field"
          submitLabel="Αποθήκευση"
          onlyWhenChanged
          onSuccess={close}
          onCancel={close}
        >
          <input type="hidden" name="id" value={message.id} />
          <textarea
            className="input"
            name="body"
            aria-label="Διόρθωση Μηνύματος"
            defaultValue={message.body ?? ""}
            maxLength={4000}
            required
          />
        </JForm>
      )}
      {mode === "delete" && (
        <JForm
          action={deleteMessage}
          className="j3-field"
          submitLabel="Διαγραφή"
          isDanger
          onSuccess={close}
          onCancel={close}
        >
          <input type="hidden" name="id" value={message.id} />
          <p className="muted">{DELETE_WARNING}</p>
        </JForm>
      )}
    </div>
  );
}
