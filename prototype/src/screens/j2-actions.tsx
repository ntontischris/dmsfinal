"use client";

import { useState } from "react";

import { NOW } from "@/data/filming";
import {
  MESSAGE_RULES,
  REQUEST_KINDS,
  type Message,
  type RequestKind,
} from "@/data/messages";
import {
  assigneeFor,
  canDeleteMessage,
  canEditMessage,
  isOwnMessage,
  minutesSince,
  productionsOfClient,
} from "@/data/messages-access";
import type { RoleId } from "@/data/roles";

interface ActionsProps {
  role: RoleId;
  message: Message;
  onChange: (next: Message) => void;
}

type Mode = null | "request" | "tag" | "edit";

const KINDS = REQUEST_KINDS.filter((k) => k !== "αλλαγή μετά την έγκριση");

export function MessageActions({ role, message, onChange }: ActionsProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState(message.text);
  if (message.deletedAt) return null;
  const isClientMsg = message.author.kind === "client";
  const isOwn = isOwnMessage(role, message);
  const toggle = (next: Mode) => setMode(mode === next ? null : next);
  const markRequest = (kind: RequestKind) => {
    onChange({
      ...message,
      request: {
        kind,
        state: "ανοιχτό",
        assigneeId: assigneeFor(message.clientId, message.productionId),
        declaredBy: "ομάδα",
        declaredAt: NOW,
      },
    });
    setMode(null);
  };
  return (
    <div className="stack">
      <div className="btn-row">
        {isClientMsg && !message.request && (
          <button
            className="button"
            type="button"
            onClick={() => toggle("request")}
          >
            Σημείωσε ως Αίτημα
          </button>
        )}
        <button className="button" type="button" onClick={() => toggle("tag")}>
          Αλλαγή ετικέτας
        </button>
        {canEditMessage(role, message) && (
          <button
            className="button"
            type="button"
            onClick={() => toggle("edit")}
          >
            Διόρθωση
          </button>
        )}
        {canDeleteMessage(role, message) && (
          <button
            className="button"
            data-danger
            type="button"
            onClick={() => onChange({ ...message, deletedAt: NOW })}
          >
            Διαγραφή
          </button>
        )}
      </div>
      {isOwn && message.request && (
        <p
          className="muted"
          title="Ένα Μήνυμα που έγινε Αίτημα δεν διαγράφεται."
        >
          Δεν διαγράφεται: το Μήνυμα έγινε Αίτημα.
        </p>
      )}
      {isOwn && canEditMessage(role, message) && (
        <p className="muted">
          μπορείς να το διορθώσεις για{" "}
          {MESSAGE_RULES.editMinutes - minutesSince(message.at)} λεπτά
        </p>
      )}
      {mode === "request" && (
        <div className="btn-row">
          {KINDS.map((kind) => (
            <button
              key={kind}
              className="button"
              type="button"
              onClick={() => markRequest(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
      )}
      {mode === "tag" && (
        <TagSelect
          message={message}
          onPick={(productionId) => {
            onChange({ ...message, productionId });
            setMode(null);
          }}
        />
      )}
      {mode === "edit" && (
        <div className="j2-form">
          <textarea
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="btn-row">
            <button
              data-primary
              type="button"
              disabled={text.trim() === ""}
              onClick={() => {
                onChange({ ...message, text: text.trim(), editedAt: NOW });
                setMode(null);
              }}
            >
              Αποθήκευση
            </button>
            <button
              className="button"
              type="button"
              onClick={() => setMode(null)}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TagSelect({
  message,
  onPick,
}: {
  message: Message;
  onPick: (productionId: string | undefined) => void;
}) {
  return (
    <label className="toolbar">
      <span>Ετικέτα</span>
      <select
        className="input"
        value={message.productionId ?? ""}
        onChange={(e) => onPick(e.target.value || undefined)}
      >
        <option value="">χωρίς ετικέτα</option>
        {productionsOfClient(message.clientId).map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}

