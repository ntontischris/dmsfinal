"use client";

import { useState, useTransition } from "react";

import { Entity, Person } from "@/spaces/kit/parts";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { correctReceipt, deleteReceipt } from "../actions";
import { decimalText } from "../money";
import type { PaymentMethod } from "../types";
import type { I4Row } from "./i4-adapter";

interface I4ListProps {
  rows: readonly I4Row[];
  methods: readonly PaymentMethod[];
  hasActions: boolean;
  today: string;
}

type Action = "διόρθωση" | "διαγραφή";
interface Editing {
  id: string;
  action: Action;
}
type Trail = Readonly<Record<string, string>>;

interface Correction {
  amount: string;
  receivedOn: string;
  methodId: string;
  note: string;
}

const correctionOf = (r: I4Row): Correction => ({
  amount: decimalText(r.amount),
  receivedOn: r.date,
  methodId: r.methodId,
  note: r.note,
});

const formDataOf = (
  id: string,
  reason: string,
  correction: Correction | null,
): FormData => {
  const data = new FormData();
  data.set("id", id);
  data.set("reason", reason);
  Object.entries(correction ?? {}).forEach(([key, value]) =>
    data.set(key, value),
  );
  return data;
};

// Τα πεδία της διόρθωσης (ποσό, ημερομηνία, Τρόπος, σημείωση)· ο Τρόπος της Είσπραξης μένει διαθέσιμος κι αν αποσύρθηκε.
function CorrectionFields(props: {
  value: Correction;
  methods: readonly PaymentMethod[];
  onChange: (patch: Partial<Correction>) => void;
}) {
  const { value, onChange } = props;
  return (
    <>
      <input
        className="input"
        aria-label="Ποσό (€, με ΦΠΑ)"
        value={value.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
      />
      <input
        className="input"
        type="date"
        aria-label="Ημερομηνία"
        value={value.receivedOn}
        onChange={(e) => onChange({ receivedOn: e.target.value })}
      />
      <select
        className="select"
        aria-label="Τρόπος"
        value={value.methodId}
        onChange={(e) => onChange({ methodId: e.target.value })}
      >
        {props.methods
          .filter((m) => !m.retired || m.id === value.methodId)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
      </select>
      <input
        className="input"
        aria-label="Σημείωση"
        placeholder="Σημείωση"
        value={value.note}
        onChange={(e) => onChange({ note: e.target.value })}
      />
    </>
  );
}

function ReasonBox(props: {
  row: I4Row;
  action: Action;
  methods: readonly PaymentMethod[];
  onDone: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [correction, setCorrection] = useState(() => correctionOf(props.row));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDelete = props.action === "διαγραφή";
  const handleConfirm = () =>
    startTransition(async () => {
      const data = formDataOf(
        props.row.id,
        reason.trim(),
        isDelete ? null : correction,
      );
      const state = isDelete
        ? await deleteReceipt({}, data)
        : await correctReceipt({}, data);
      if (state.error) return setError(state.error);
      props.onDone(reason.trim());
    });
  return (
    <div className="stack">
      {!isDelete && (
        <CorrectionFields
          value={correction}
          methods={props.methods}
          onChange={(patch) => setCorrection((prev) => ({ ...prev, ...patch }))}
        />
      )}
      <input
        className="input"
        placeholder={`Λόγος ${isDelete ? "διαγραφής" : "διόρθωσης"} (υποχρεωτικός)`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger={isDelete}
          disabled={reason.trim() === "" || isPending}
          onClick={handleConfirm}
        >
          {isPending ? "Αποθήκευση…" : "Επιβεβαίωση"}
        </button>
        <button type="button" className="button" onClick={props.onCancel}>
          Άκυρο
        </button>
      </div>
      <span
        className="feedback-msg"
        data-tone="error"
        data-shown={error !== null}
        role="alert"
      >
        {error && (
          <>
            <span aria-hidden="true">!</span> {error}
          </>
        )}
      </span>
    </div>
  );
}

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
  if (!props.row.canEdit) return <>—</>;
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
  r: I4Row;
  methods: readonly PaymentMethod[];
  hasActions: boolean;
  editing: Editing | null;
  trail?: string;
  onStart: (action: Action) => void;
  onDone: (action: Action, reason: string) => void;
  onCancel: () => void;
}

const invoicesText = (invoices: I4Row["invoices"]): string => {
  if (invoices === null) return "—";
  return invoices.length > 0 ? invoices.join(", ") : "υπόλοιπο υπέρ του πελάτη";
};

function ReceiptLine(p: RowProps) {
  const { r } = p;
  const active = p.editing?.id === r.id ? p.editing : null;
  return (
    <tr>
      <td data-label="Ημερομηνία">{fmtDate(r.date)}</td>
      <td data-label="Πελάτης" className="i245-cell">
        <Entity name={r.clientName} />
      </td>
      <td data-label="Ποσό" className="num i245-money">
        {fmtMoney(r.amount)}
      </td>
      <td data-label="Για Τιμολόγιο" className="i245-cell">
        {r.deletedReason === null ? invoicesText(r.invoices) : "—"}
      </td>
      <td data-label="Τρόπος" className="i245-cell">
        {r.method}
      </td>
      <td data-label="Σημείωση" className="i245-cell">
        {r.note || "—"}
      </td>
      <td data-label="Ποιος">
        <Person name={r.by} />
      </td>
      {p.hasActions && (
        <td data-label="Ενέργειες" className="i245-cell">
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
      <th>Ημερομηνία</th>
      <th>Πελάτης</th>
      <th className="num">Ποσό</th>
      <th>Για Τιμολόγιο</th>
      <th>Τρόπος</th>
      <th>Σημείωση</th>
      <th>Ποιος</th>
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
    <div className="scroll i245-glass">
      <table className="rtable">
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
    </div>
  );
}
