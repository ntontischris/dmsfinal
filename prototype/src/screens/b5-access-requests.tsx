"use client";

import { useState } from "react";

import { Badge } from "@/screens/shared";

export interface RequestItem {
  id: string;
  requester: string;
  client: string;
  currentOwner: string;
  topic: string;
  comment: string;
  date: string;
}

type Mode = "reject" | "transfer";

interface RowProps {
  item: RequestItem;
  onResolve: (id: string, message: string) => void;
}

function RequestRow({ item, onResolve }: RowProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [reason, setReason] = useState("");

  const approve = () =>
    onResolve(
      item.id,
      `Άνοιξε Ευκαιρία με Υπεύθυνο ${item.requester}· ο/η ${item.currentOwner} ενημερώθηκε.`,
    );
  const reject = () =>
    onResolve(
      item.id,
      `Απορρίφθηκε με σχόλιο· ο/η ${item.requester} ενημερώθηκε.`,
    );
  const transfer = () =>
    onResolve(
      item.id,
      `Ο Πελάτης «${item.client}» πέρασε στον/στην ${item.requester}. Οι ανοιχτές Ευκαιρίες του/της ${item.currentOwner} ακολουθούν τον Πελάτη.`,
    );

  return (
    <li className="card">
      <div className="card-title">
        <h2>{item.client}</h2>
        <Badge>{item.date}</Badge>
      </div>
      <dl className="dl">
        <dt>Πωλητής</dt>
        <dd>{item.requester}</dd>
        <dt>Σημερινός Υπεύθυνος</dt>
        <dd>{item.currentOwner}</dd>
        <dt>Τι αφορά</dt>
        <dd>{item.topic}</dd>
        <dt>Σχόλιο</dt>
        <dd>{item.comment}</dd>
      </dl>
      <div className="btn-row">
        <button type="button" className="button" data-primary="true" onClick={approve}>
          Έγκριση
        </button>
        <button type="button" className="button" onClick={() => setMode("reject")}>
          Απόρριψη
        </button>
        <button type="button" className="button" onClick={() => setMode("transfer")}>
          Μεταβίβαση Πελάτη
        </button>
      </div>
      {mode === "reject" && (
        <div className="stack" style={{ marginTop: "var(--space-3)" }}>
          <textarea
            className="input"
            rows={2}
            placeholder="Σχόλιο απόρριψης (υποχρεωτικό)"
            aria-label="Σχόλιο απόρριψης"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button
            type="button"
            className="button"
            data-danger="true"
            disabled={reason.trim() === ""}
            onClick={reject}
          >
            Επιβεβαίωση απόρριψης
          </button>
        </div>
      )}
      {mode === "transfer" && (
        <div className="stack" style={{ marginTop: "var(--space-3)" }}>
          <p className="note">
            Ολόκληρος ο Πελάτης περνά στον/στην {item.requester}. Οι ανοιχτές
            Ευκαιρίες του/της {item.currentOwner} ακολουθούν τον Πελάτη.
          </p>
          <button type="button" className="button" data-danger="true" onClick={transfer}>
            Επιβεβαίωση μεταβίβασης
          </button>
        </div>
      )}
    </li>
  );
}

export function AccessRequests({ items }: { items: readonly RequestItem[] }) {
  const [resolved, setResolved] = useState<Readonly<Record<string, string>>>(
    {},
  );
  const pending = items.filter((item) => !(item.id in resolved));
  const messages = Object.values(resolved);

  return (
    <>
      {pending.length === 0 ? (
        <p className="muted">Δεν υπάρχουν εκκρεμή Αιτήματα πρόσβασης.</p>
      ) : (
        <ul className="list">
          {pending.map((item) => (
            <RequestRow
              key={item.id}
              item={item}
              onResolve={(id, message) =>
                setResolved({ ...resolved, [id]: message })
              }
            />
          ))}
        </ul>
      )}
      {messages.map((message) => (
        <p key={message} className="note" role="status">
          {message}
        </p>
      ))}
    </>
  );
}
