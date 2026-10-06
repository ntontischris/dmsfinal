"use client";

import { useState } from "react";

import { Field } from "@/screens/i3-fields";

import "./i13.css";

export interface CorrectInvoice {
  number: string;
  issueDate: string;
  dueDate: string;
  net: string;
  vat: string;
  mark: string;
}

type Outcome = { kind: "corrected" | "voided"; text: string } | null;

const LABELS: Readonly<Record<keyof CorrectInvoice, string>> = {
  number: "Αριθμός",
  issueDate: "Ημερομηνία έκδοσης",
  dueDate: "Λήξη",
  net: "Καθαρό (€)",
  vat: "ΦΠΑ (€)",
  mark: "ΜΑΡΚ",
};

const FIELD_KEYS = Object.keys(LABELS) as (keyof CorrectInvoice)[];

const changedText = (a: CorrectInvoice, b: CorrectInvoice): string =>
  FIELD_KEYS.filter((k) => a[k] !== b[k])
    .map((k) => `${LABELS[k]}: ${a[k] || "—"} → ${b[k] || "—"}`)
    .join(", ");

function CorrectionFields(props: {
  value: CorrectInvoice;
  onChange: (value: CorrectInvoice) => void;
}) {
  return (
    <div className="i13-fields">
      {FIELD_KEYS.map((key) => (
        <Field key={key} label={LABELS[key]}>
          <input
            className="input"
            type={key.endsWith("Date") ? "date" : "text"}
            value={props.value[key]}
            onChange={(e) =>
              props.onChange({ ...props.value, [key]: e.target.value })
            }
          />
        </Field>
      ))}
    </div>
  );
}

function VoidForm(props: { onVoid: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="stack">
      <Field label="Λόγος ακύρωσης (υποχρεωτικός)">
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="π.χ. ανέβηκε δύο φορές, λάθος Πελάτης"
        />
      </Field>
      <button
        type="button"
        className="button"
        data-danger="true"
        disabled={reason.trim() === ""}
        onClick={() => props.onVoid(reason.trim())}
      >
        Ακύρωση καταχώρισης
      </button>
    </div>
  );
}

export function I3Correct({ invoice }: { invoice: CorrectInvoice }) {
  const [value, setValue] = useState(invoice);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const diff = changedText(invoice, value);
  const handleSave = () =>
    setOutcome({
      kind: "corrected",
      text: `Διόρθωση στοιχείων γράφτηκε στο ίχνος: ${diff}.`,
    });
  return (
    <section className="card">
      <h2>Διόρθωση ή ακύρωση καταχώρισης</h2>
      <p className="note">
        Η διόρθωση και η ακύρωση δεν στέλνουν email. Λάθος μέσα στο ίδιο το
        τιμολόγιο διορθώνεται με πιστωτικό, όχι με ακύρωση.
      </p>
      <h3>Διόρθωση στοιχείων</h3>
      <CorrectionFields value={value} onChange={setValue} />
      <p>
        <button
          type="button"
          className="button"
          disabled={diff === ""}
          onClick={handleSave}
        >
          Αποθήκευση διόρθωσης
        </button>
      </p>
      <h3>Ακύρωση καταχώρισης</h3>
      <p className="muted">
        Φεύγει από την Καρτέλα και τα σύνολα. Ο πελάτης δεν τη βλέπει· η ομάδα
        τη βλέπει ως «ακυρώθηκε» με τον λόγο.
      </p>
      <VoidForm
        onVoid={(reason) =>
          setOutcome({
            kind: "voided",
            text: `Ακυρώθηκε η καταχώριση. Λόγος: ${reason}`,
          })
        }
      />
      {outcome && (
        <p className="note" role="status">
          {outcome.text} (prototype: δεν αποθηκεύεται)
        </p>
      )}
    </section>
  );
}
