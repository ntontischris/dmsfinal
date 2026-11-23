"use client";

import { useState } from "react";

import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { PaymentMethod } from "../types";
import type { I4Row } from "./i4-adapter";
import { ReasonBox, type Action } from "./i4-reason";

import "./money-lines.css";

interface I4ListProps {
  rows: readonly I4Row[];
  methods: readonly PaymentMethod[];
  hasActions: boolean;
  today: string;
}

interface Editing {
  id: string;
  action: Action;
}
type Trail = Readonly<Record<string, string>>;

function RowActions(props: {
  row: I4Row;
  trail?: string;
  onStart: (action: Action) => void;
}) {
  if (props.trail) return <span className="i245-sub">{props.trail}</span>;
  if (props.row.deletedReason !== null)
    return (
      <span className="i245-sub">
        Διαγράφηκε. Λόγος: {props.row.deletedReason}
      </span>
    );
  if (!props.row.canEdit) return null;
  return (
    <>
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
    </>
  );
}

interface RowProps {
  r: I4Row;
  methods: readonly PaymentMethod[];
  hasActions: boolean;
  editing: Editing | null;
  trail?: string;
  onStart: (action: Action) => void;
  onDone: (action: Action, reason: string) => void;
  onCancel: () => void;
}

const invoicesText = (invoices: I4Row["invoices"]): string | null => {
  if (invoices === null) return null;
  return invoices.length > 0
    ? `για ${invoices.join(", ")}`
    : "υπόλοιπο υπέρ του πελάτη";
};

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

const detailsOf = (r: I4Row): string =>
  [
    r.deletedReason === null ? invoicesText(r.invoices) : null,
    r.note || null,
    r.by ? `καταχώρησε ${r.by}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

function ReceiptLine(p: RowProps) {
  const { r } = p;
  const active = p.editing?.id === r.id ? p.editing : null;
  return (
    <tr className="ml-line" data-faded={r.deletedReason !== null || undefined}>
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(r.clientName)}
      </td>
      <td className="ml-main">
        <span className="ml-tag">
          {fmtDate(r.date)} · {r.method}
        </span>
        <strong>{r.clientName}</strong>
        <small>{detailsOf(r)}</small>
      </td>
      <td className="ml-amount">
        {fmtMoney(r.amount)}
        {r.withheld > 0 && (
          <small>
            + {r.withholdingLabel ?? "παρακράτηση"} {fmtMoney(r.withheld)}
          </small>
        )}
      </td>
      {p.hasActions && (
        <td className={active ? "ml-edit" : "ml-quick"}>
          {active ? (
            <ReasonBox
              row={r}
              action={active.action}
              methods={p.methods}
              onDone={(reason) => p.onDone(active.action, reason)}
              onCancel={p.onCancel}
            />
          ) : (
            <RowActions row={r} trail={p.trail} onStart={p.onStart} />
          )}
        </td>
      )}
    </tr>
  );
}

function HeadRow({ hasActions }: { hasActions: boolean }) {
  return (
    <tr>
      <th>Πελάτης</th>
      <th>Είσπραξη</th>
      <th>Ποσό</th>
      {hasActions && <th>Ενέργειες</th>}
    </tr>
  );
}

// Ο πίνακας Εισπράξεων του prototype (`screens/i4-list.tsx`): διόρθωση και διαγραφή με λόγο, μέσω receipt_correct και
// receipt_delete. Μετά την επιτυχία η γραμμή λέει τι γράφτηκε στο ίχνος.
export function I4List({ rows, methods, hasActions, today }: I4ListProps) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [trail, setTrail] = useState<Trail>({});
  const handleDone = (action: Action, id: string, reason: string) => {
    setTrail((prev) => ({
      ...prev,
      [id]: `Ίχνος: ${action} στις ${fmtDate(today)}. Λόγος: ${reason}`,
    }));
    setEditing(null);
  };
  return (
    <table className="ml-table ml-list">
        <thead>
          <HeadRow hasActions={hasActions} />
        </thead>
        <tbody>
          {rows.map((r) => (
            <ReceiptLine
              key={r.id}
              r={r}
              methods={methods}
              hasActions={hasActions}
              editing={editing}
              trail={trail[r.id]}
              onStart={(action) => setEditing({ id: r.id, action })}
              onDone={(action, reason) => handleDone(action, r.id, reason)}
              onCancel={() => setEditing(null)}
            />
          ))}
        </tbody>
    </table>
  );
}
