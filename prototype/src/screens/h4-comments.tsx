"use client";

import { useState } from "react";

import {
  fmtClock,
  parseClock,
  type ClientComment,
  type ClientVersionView,
} from "@/screens/h3-model";
import { Badge, fmtDate } from "@/screens/shared";

interface CommentListProps {
  comments: readonly ClientComment[];
}

export function H4CommentList({ comments }: CommentListProps) {
  if (comments.length === 0)
    return <p className="muted">Δεν υπάρχουν σχόλια σε αυτή την Έκδοση.</p>;
  return (
    <ul className="list">
      {comments.map((c) => (
        <li key={c.id} className="h34-item">
          <div className="h34-signals">
            <strong>{c.who}</strong>
            {c.at !== undefined && <Badge>{fmtClock(c.at)}</Badge>}
            {c.isBrokenLink && (
              <Badge tone="attention">δεν ανοίγει το link</Badge>
            )}
            <span className="muted">{fmtDate(c.when)}</span>
          </div>
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

interface TimeFieldProps {
  host: ClientVersionView["host"];
  value: string;
  onChange: (value: string) => void;
}

// Vimeo/YouTube: ο χρόνος μπαίνει από τον player. Drive: τον γράφει ο ίδιος ο πελάτης.
function TimeField({ host, value, onChange }: TimeFieldProps) {
  if (host === "Google Drive")
    return (
      <label>
        Χρόνος στο video (λεπτά:δευτερόλεπτα, προαιρετικό)
        <input
          className="input"
          value={value}
          placeholder="0:12"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  const seconds = parseClock(value) ?? 0;
  return (
    <label>
      Χρόνος στο video: {fmtClock(seconds)} (ο χρόνος μπαίνει από τον player)
      <input
        type="range"
        min={0}
        max={180}
        value={seconds}
        onChange={(event) => onChange(fmtClock(Number(event.target.value)))}
      />
    </label>
  );
}

interface CommentFormProps {
  host: ClientVersionView["host"];
  onAdd: (text: string, at?: number) => void;
}

export function H4CommentForm({ host, onAdd }: CommentFormProps) {
  const [text, setText] = useState("");
  const [time, setTime] = useState(host === "Google Drive" ? "" : "0:00");
  const parsed = parseClock(time);
  const isTimeBad = time.trim() !== "" && parsed === null;
  const isValid = text.trim().length > 0 && !isTimeBad;

  const handleSubmit = () => {
    onAdd(text.trim(), parsed ?? undefined);
    setText("");
  };

  return (
    <div className="h34-form">
      <TimeField host={host} value={time} onChange={setTime} />
      {isTimeBad && (
        <span className="muted">
          Γράψε τον χρόνο ως 0:12 (λεπτά:δευτερόλεπτα).
        </span>
      )}
      <label>
        Σχόλιο
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          disabled={!isValid}
          onClick={handleSubmit}
        >
          Προσθήκη σχολίου
        </button>
      </div>
      <span className="muted">(prototype: δεν αποθηκεύεται)</span>
    </div>
  );
}
