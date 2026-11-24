"use client";

import { useState, useTransition } from "react";

import { correctReceipt, deleteReceipt } from "../actions";
import { decimalText } from "../money";
import type { PaymentMethod } from "../types";
import type { I4Row } from "./i4-adapter";

export type Action = "διόρθωση" | "διαγραφή";

// Η διόρθωση ή η διαγραφή μιας Είσπραξης με λόγο (receipt_correct, receipt_delete), μέσα στη γραμμή της.
interface Correction {
  amount: string;
  receivedOn: string;
  methodId: string;
  note: string;
  // Η παρακράτηση διορθώνεται (d6)· με μηδέν φεύγει και το είδος. Τα δεμένα Τιμολόγια μένουν όπως ήταν.
  withheld: string;
  withholdingId: string;
  invoiceIds: string;
}

const correctionOf = (r: I4Row): Correction => ({
  amount: decimalText(r.amount),
  receivedOn: r.date,
  methodId: r.methodId,
  note: r.note,
  withheld: r.withheld > 0 ? decimalText(r.withheld) : "",
  withholdingId: r.withholdingId ?? "",
  invoiceIds: r.invoiceIds.join(","),
});

const isZero = (text: string): boolean =>
  (Number(text.replace(",", ".")) || 0) === 0;

// Παρακράτηση μηδέν = χωρίς είδος (η βάση δεν δέχεται είδος χωρίς ποσό).
const sentOf = (c: Correction): Correction =>
  isZero(c.withheld) ? { ...c, withheld: "", withholdingId: "" } : c;

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
      {value.withholdingId !== "" && (
        <input
          className="input"
          aria-label="Ποσό παρακράτησης (€)"
          placeholder="Παρακράτηση"
          value={value.withheld}
          onChange={(e) => onChange({ withheld: e.target.value })}
        />
      )}
    </>
  );
}

export function ReasonBox(props: {
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
        isDelete ? null : sentOf(correction),
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
      <div className="ml-actions">
        <button type="button" onClick={props.onCancel}>
          Άκυρο
        </button>
        <button
          type="button"
          data-primary={isDelete ? undefined : true}
          data-danger={isDelete || undefined}
          disabled={reason.trim() === "" || isPending}
          onClick={handleConfirm}
        >
          {isPending ? "Αποθήκευση…" : "Επιβεβαίωση"}
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
