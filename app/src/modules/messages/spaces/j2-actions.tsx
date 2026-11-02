"use client";

import { useCallback, useState } from "react";

import { deleteMessage, editMessage, setMessageTag } from "../actions";
import { markRequest } from "../actions-requests";
import { DELETE_WARNING } from "../labels";
import { REQUEST_KIND_LABELS } from "../request-labels";
import { REQUEST_KINDS, type ThreadProduction } from "../view-schema";
import type { J2Message } from "./j2-adapter";
import { JForm } from "./j2-form";

interface ActionsProps {
  message: J2Message;
  productions: readonly ThreadProduction[];
  canClearTag: boolean;
}

type Mode = null | "request" | "tag" | "edit" | "delete";

// Οι ενέργειες ενός Μηνύματος του prototype (`screens/j2-actions.tsx`): Σημείωσε ως Αίτημα, Αλλαγή ετικέτας, Διόρθωση,
// Διαγραφή. Κάθε μία στέλνει στο πραγματικό server action· η βάση ξαναελέγχει.
export function MessageActions({
  message,
  productions,
  canClearTag,
}: ActionsProps) {
  const [mode, setMode] = useState<Mode>(null);
  const close = useCallback(() => setMode(null), []);
  const toggle = (next: Mode) => setMode(mode === next ? null : next);
  const showTag = message.canTag && (canClearTag || productions.length > 0);
  if (!showTag && !message.canMark && !message.canEdit && !message.canDelete)
    return null;
  return (
    <div className="stack">
      <div className="btn-row">
        {message.canMark && (
          <button
            className="button"
            type="button"
            onClick={() => toggle("request")}
          >
            Σημείωσε ως Αίτημα
          </button>
        )}
        {showTag && (
          <button
            className="button"
            type="button"
            onClick={() => toggle("tag")}
          >
            Αλλαγή ετικέτας
          </button>
        )}
        {message.canEdit && (
          <button
            className="button"
            type="button"
            onClick={() => toggle("edit")}
          >
            Διόρθωση
          </button>
        )}
        {message.canDelete && (
          <button
            className="button"
            data-danger
            type="button"
            onClick={() => toggle("delete")}
          >
            Διαγραφή
          </button>
        )}
      </div>
      {message.isOwnRequest && (
        <p
          className="muted"
          title="Ένα Μήνυμα που έγινε Αίτημα δεν διαγράφεται."
        >
          Δεν διαγράφεται: το Μήνυμα έγινε Αίτημα.
        </p>
      )}
      {message.canEdit && message.editMinutesLeft !== null && (
        <p className="muted">
          μπορείς να το διορθώσεις για {message.editMinutesLeft} λεπτά
        </p>
      )}
      {mode === "request" && (
        <JForm action={markRequest} className="btn-row" onSuccess={close}>
          <input type="hidden" name="id" value={message.id} />
          {REQUEST_KINDS.map((kind) => (
            <button
              key={kind}
              className="button"
              type="submit"
              name="kind"
              value={kind}
            >
              {REQUEST_KIND_LABELS[kind]}
            </button>
          ))}
        </JForm>
      )}
      {mode === "tag" && (
        <JForm action={setMessageTag} className="toolbar" onSuccess={close}>
          <input type="hidden" name="id" value={message.id} />
          <label className="toolbar">
            <span>Ετικέτα</span>
            <select
              className="input"
              name="productionId"
              defaultValue={message.productionId ?? ""}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {canClearTag && <option value="">χωρίς ετικέτα</option>}
              {productions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </JForm>
      )}
      {mode === "edit" && (
        <JForm
          action={editMessage}
          submitLabel="Αποθήκευση"
          onlyWhenChanged
          onSuccess={close}
          onCancel={close}
        >
          <input type="hidden" name="id" value={message.id} />
          <textarea
            className="input"
            name="body"
            aria-label="Διόρθωση"
            defaultValue={message.body ?? ""}
            maxLength={4000}
            required
          />
        </JForm>
      )}
      {mode === "delete" && (
        <JForm
          action={deleteMessage}
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
