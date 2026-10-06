"use client";

import { useState } from "react";

import { AmountFields, InvoiceFields } from "@/screens/i3-fields";
import {
  EMPTY_FORM,
  canSubmit,
  hasVatMismatch,
  num,
  readPdf,
  warningsOf,
  type FormState,
  type I3Context,
} from "@/screens/i3-model";
import { CoveragePreview, WarningsList } from "@/screens/i3-preview";

import "./i13.css";

function PdfStep({ onRead }: { onRead: () => void }) {
  return (
    <section className="card">
      <h2>Βήμα 1: Ανέβασμα PDF</h2>
      <div className="toolbar">
        <input className="input" type="file" accept="application/pdf" />
        <button type="button" className="button" onClick={onRead}>
          Διάβασε το PDF
        </button>
      </div>
      <p className="note">
        Προσομοίωση: το κουμπί γεμίζει τα πεδία με τιμές που «διάβασε» το AI.
        Έλεγξέ τες πριν επιβεβαιώσεις.
      </p>
    </section>
  );
}

function SubmitBar(props: {
  form: FormState;
  ctx: I3Context;
  onChange: (change: Partial<FormState>) => void;
  onSubmit: () => void;
}) {
  const { form, ctx, onChange } = props;
  return (
    <>
      {hasVatMismatch(form, ctx) && (
        <label className="i13-check">
          <input
            type="checkbox"
            checked={form.vatConfirmed}
            onChange={(e) => onChange({ vatConfirmed: e.target.checked })}
          />
          <span>
            Το επιβεβαίωσα: το ΑΦΜ του PDF είναι σωστό παρά τη διαφορά.
          </span>
        </label>
      )}
      <p className="note">
        Η καταχώριση στέλνει email με το PDF σε όλους τους Χρήστες του Πελάτη.
        Δεν παραλείπεται.
      </p>
      <button
        type="button"
        className="button"
        data-primary="true"
        disabled={!canSubmit(form, ctx)}
        onClick={props.onSubmit}
      >
        Επιβεβαίωση και καταχώρηση
      </button>
    </>
  );
}

function DoneNotice({ ctx, number }: { ctx: I3Context; number: string }) {
  const to = ctx.recipients.map((r) => `${r.name} (${r.email})`).join(", ");
  return (
    <section className="card i13-done" role="status">
      <h2>Καταχωρήθηκε το {number}</h2>
      <p className="i13-wrap">
        Καταχωρήθηκε. Email με το PDF στάλθηκε σε: {to || "—"}
      </p>
      <p className="muted">(prototype: δεν αποθηκεύεται)</p>
    </section>
  );
}

export function I3Workbench({ ctx }: { ctx: I3Context }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [doneNumber, setDoneNumber] = useState<string | null>(null);
  const handleChange = (change: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...change }));
  if (doneNumber !== null) return <DoneNotice ctx={ctx} number={doneNumber} />;
  return (
    <div className="i13-layout">
      <div className="stack" style={{ width: "100%" }}>
        <PdfStep onRead={() => setForm(readPdf(ctx))} />
        <section className="card" style={{ width: "100%" }}>
          <h2>Βήμα 2: Στοιχεία</h2>
          <InvoiceFields form={form} ctx={ctx} onChange={handleChange} />
          <AmountFields form={form} ctx={ctx} onChange={handleChange} />
          <WarningsList warnings={warningsOf(form, ctx)} />
          <SubmitBar
            form={form}
            ctx={ctx}
            onChange={handleChange}
            onSubmit={() => setDoneNumber(form.number.trim())}
          />
          <p className="muted">(prototype: δεν αποθηκεύεται)</p>
        </section>
      </div>
      <CoveragePreview
        open={ctx.open}
        net={num(form.net)}
        isCredit={form.kind === "πιστωτικό"}
        toInvoice={ctx.toInvoice}
      />
    </div>
  );
}
