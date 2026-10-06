"use client";

import { useState } from "react";

import type { VersionComment } from "@/data/deliverables";
import { fmtClock, parseClock, whoLabel } from "@/screens/h2-model";
import { Badge, fmtDate } from "@/screens/shared";

export function CommentList({
  comments,
}: {
  comments: readonly VersionComment[];
}) {
  if (comments.length === 0)
    return <p className="muted">Κανένα σχόλιο σε αυτή την Έκδοση.</p>;
  return (
    <ul className="list">
      {comments.map((c) => (
        <li key={c.id} className="h2-comment">
          <div className="h2-signals">
            <strong>{whoLabel(c.who)}</strong>
            <span className="muted">{fmtDate(c.when)}</span>
            {c.at !== undefined && <Badge>{fmtClock(c.at)}</Badge>}
            {c.isClient && <Badge>πελάτης</Badge>}
            {c.isInternal && <Badge tone="attention">εσωτερικό</Badge>}
            {c.isBrokenLink && (
              <Badge tone="attention">δεν ανοίγει το link</Badge>
            )}
          </div>
          <p>{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

interface CommentFormProps {
  onAdd: (comment: { text: string; at?: number; isInternal: boolean }) => void;
}

export function CommentForm({ onAdd }: CommentFormProps) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const at = parseClock(time);
  const isValid = text.trim().length > 0 && at !== null;
  const submit = () => {
    onAdd({ text: text.trim(), at: at ?? undefined, isInternal });
    setText("");
    setTime("");
  };
  return (
    <div className="h2-form">
      <label>
        Νέο σχόλιο
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <label>
        Χρόνος στο video (mm:ss, προαιρετικό)
        <input
          className="input"
          value={time}
          placeholder="0:12"
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      {at === null && (
        <span className="h2-error">Ο χρόνος γράφεται ως mm:ss, π.χ. 0:12.</span>
      )}
      <label className="h2-check">
        <input
          type="checkbox"
          checked={isInternal}
          onChange={(event) => setIsInternal(event.target.checked)}
        />
        Εσωτερικό (δεν το βλέπει ο πελάτης)
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          disabled={!isValid}
          onClick={submit}
        >
          Προσθήκη σχολίου
        </button>
      </div>
    </div>
  );
}
