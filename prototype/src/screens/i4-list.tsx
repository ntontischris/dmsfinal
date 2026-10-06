"use client";

import { useState } from "react";

import { fmtDate, fmtMoney } from "@/screens/shared";

import "./i245.css";

export interface ReceiptRow {
  id: string;
  date: string;
  clientName: string;
  amount: number;
  method: string;
  note: string;
  by: string;
}

interface I4ListProps {
  rows: readonly ReceiptRow[];
  canEdit: boolean;
  today: string;
}

type Action = "διόρθωση" | "διαγραφή";
interface Editing {
  id: string;
  action: Action;
}
type Trail = Readonly<Record<string, string>>;

function ReasonBox(props: {
  action: Action;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="stack">
      <input
        className="input"
        placeholder={`Λόγος ${props.action === "διαγραφή" ? "διαγραφής" : "διόρθωσης"} (υποχρεωτικός)`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger={props.action === "διαγραφή"}
          disabled={reason.trim() === ""}
          onClick={() => props.onConfirm(reason.trim())}
        >
          Επιβεβαίωση
        </button>
        <button type="button" className="button" onClick={props.onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function RowActions(props: {
  canEdit: boolean;
  trail?: string;
  onStart: (action: Action) => void;
}) {
  if (props.trail) return <span className="i245-sub">{props.trail}</span>;
  if (!props.canEdit) return <>—</>;
  return (
    <div className="btn-row">
      <button
        type="button"
        className="button"
        onClick={() => props.onStart("διόρθωση")}
      >
        Διόρθωση
      </button>
      <button
        type="button"
        className="button"
        onClick={() => props.onStart("διαγραφή")}
      >
        Διαγραφή
      </button>
    </div>
  );
}

interface RowProps {
  r: ReceiptRow;
  canEdit: boolean;
  editing: Editing | null;
  trail?: string;
  onStart: (action: Action) => void;
  onConfirm: (action: Action, reason: string) => void;
  onCancel: () => void;
}

function ReceiptLine(p: RowProps) {
  const { r } = p;
  const active = p.editing?.id === r.id ? p.editing : null;
  return (
    <tr>
      <td data-label="Ημερομηνία">{fmtDate(r.date)}</td>
      <td data-label="Πελάτης" className="i245-cell">
        {r.clientName}
      </td>
      <td data-label="Ποσό" className="num">
        {fmtMoney(r.amount)}
      </td>
      <td data-label="Τρόπος" className="i245-cell">
        {r.method}
      </td>
      <td data-label="Σημείωση" className="i245-cell">
        {r.note || "—"}
      </td>
      <td data-label="Ποιος">{r.by}</td>
      {p.canEdit && (
        <td data-label="Ενέργειες" className="i245-cell">
          {active ? (
            <ReasonBox
              action={active.action}
              onConfirm={(reason) => p.onConfirm(active.action, reason)}
              onCancel={p.onCancel}
            />
          ) : (
            <RowActions canEdit={p.canEdit} trail={p.trail} onStart={p.onStart} />
          )}
        </td>
      )}
    </tr>
  );
}

function HeadRow({ canEdit }: { canEdit: boolean }) {
  return (
    <tr>
      <th>Ημερομηνία</th>
      <th>Πελάτης</th>
      <th className="num">Ποσό</th>
      <th>Τρόπος</th>
      <th>Σημείωση</th>
      <th>Ποιος</th>
      {canEdit && <th>Ενέργειες</th>}
    </tr>
  );
}

export function I4List({ rows, canEdit, today }: I4ListProps) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [trail, setTrail] = useState<Trail>({});
  const confirm = (action: Action, id: string, reason: string) => {
    setTrail((prev) => ({
      ...prev,
      [id]: `Ίχνος: ${action} στις ${fmtDate(today)}. Λόγος: ${reason}`,
    }));
    setEditing(null);
  };
  return (
    <table className="rtable">
      <thead>
        <HeadRow canEdit={canEdit} />
      </thead>
      <tbody>
        {rows.map((r) => (
          <ReceiptLine
            key={r.id}
            r={r}
            canEdit={canEdit}
            editing={editing}
            trail={trail[r.id]}
            onStart={(action) => setEditing({ id: r.id, action })}
            onConfirm={(action, reason) => confirm(action, r.id, reason)}
            onCancel={() => setEditing(null)}
          />
        ))}
      </tbody>
    </table>
  );
}
