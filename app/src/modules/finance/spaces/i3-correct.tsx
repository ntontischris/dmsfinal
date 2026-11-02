"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { useKeptForm } from "@/lib/use-kept-form";

import { correctInvoice, voidInvoice } from "../actions-corrections";
import { INVOICE_VOID_BODY } from "../invoice-corrections-labels";
import type { InvoiceDetail } from "../invoice-detail-schema";
import { decimalText } from "../money";
import { Field, FormFeedback } from "./i3-fields";

export interface CorrectInvoice {
  number: string;
  issueDate: string;
  dueDate: string;
  net: string;
  vat: string;
  total: string;
  mark: string;
}

const LABELS: Readonly<Record<keyof CorrectInvoice, string>> = {
  number: "Αριθμός",
  issueDate: "Ημερομηνία έκδοσης",
  dueDate: "Λήξη",
  net: "Καθαρό (€)",
  vat: "ΦΠΑ (€)",
  total: "Σύνολο (€)",
  mark: "ΜΑΡΚ",
};

const FIELD_KEYS = Object.keys(LABELS) as (keyof CorrectInvoice)[];

export const correctionOf = (invoice: InvoiceDetail): CorrectInvoice => ({
  number: invoice.number,
  issueDate: invoice.issueDate,
  dueDate: invoice.dueDate ?? "",
  net: decimalText(invoice.net),
  vat: decimalText(invoice.vat),
  total: decimalText(invoice.total),
  mark: invoice.mark ?? "",
});

export const isChanged = (a: CorrectInvoice, b: CorrectInvoice): boolean =>
  FIELD_KEYS.some((k) => a[k] !== b[k]);

function CorrectionFields(props: {
  value: CorrectInvoice;
  hasDue: boolean;
  onChange: (value: CorrectInvoice) => void;
}) {
  return (
    <div className="i13-fields">
      {FIELD_KEYS.filter((key) => key !== "dueDate" || props.hasDue).map((key) => (
        <Field key={key} label={LABELS[key]}>
          <input
            className="input"
            name={key}
            type={key.endsWith("Date") ? "date" : "text"}
            value={props.value[key]}
            onChange={(e) => props.onChange({ ...props.value, [key]: e.target.value })}
          />
        </Field>
      ))}
      <Field label="Λόγος διόρθωσης (προαιρετικός)">
        <input className="input" name="reason" maxLength={500} />
      </Field>
    </div>
  );
}

function CorrectForm({ invoice }: { invoice: InvoiceDetail }) {
  const original = correctionOf(invoice);
  const [value, setValue] = useState(original);
  const { state, isPending, onSubmit, formRef } = useKeptForm(correctInvoice);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={invoice.id} />
      {invoice.dueDate === null && <input type="hidden" name="dueDate" value="" />}
      <CorrectionFields value={value} hasDue={invoice.dueDate !== null} onChange={setValue} />
      <p>
        <button type="submit" className="button" disabled={!isChanged(original, value) || isPending}>
          {isPending ? "Αποθήκευση…" : "Αποθήκευση διόρθωσης"}
        </button>{" "}
        <FormFeedback error={state.error} notice={state.notice} />
      </p>
    </form>
  );
}

function VoidForm({ invoiceId }: { invoiceId: string }) {
  const [reason, setReason] = useState("");
  const { state, isPending, onSubmit, formRef } = useKeptForm(voidInvoice);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="stack">
      <input type="hidden" name="id" value={invoiceId} />
      <Field label="Λόγος ακύρωσης (υποχρεωτικός)">
        <input
          className="input"
          name="reason"
          maxLength={500}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="π.χ. ανέβηκε δύο φορές, λάθος Πελάτης"
        />
      </Field>
      <p className="muted">{INVOICE_VOID_BODY}</p>
      <button
        type="submit"
        className="button"
        data-danger="true"
        disabled={reason.trim() === "" || isPending}
      >
        Ακύρωση καταχώρισης
      </button>
      <FormFeedback error={state.error} notice={state.notice} />
    </form>
  );
}

// Διόρθωση ή ακύρωση (prototype `screens/i3-correct.tsx`) πάνω στις πραγματικές ενέργειες correctInvoice / voidInvoice.
// Η βάση λέει τι επιτρέπεται (can.correct, can.void).
export function I3Correct({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <Panel label="Διόρθωση ή ακύρωση καταχώρισης">
      <p className="note">
        Η διόρθωση και η ακύρωση δεν στέλνουν email. Λάθος μέσα στο ίδιο το τιμολόγιο διορθώνεται με πιστωτικό,
        όχι με ακύρωση.
      </p>
      <h3>Διόρθωση στοιχείων</h3>
      <CorrectForm invoice={invoice} />
      {invoice.can.void && (
        <>
          <h3>Ακύρωση καταχώρισης</h3>
          <p className="muted">
            Φεύγει από την Καρτέλα και τα σύνολα. Ο πελάτης δεν τη βλέπει· η ομάδα τη βλέπει ως «ακυρώθηκε» με
            τον λόγο.
          </p>
          <VoidForm invoiceId={invoice.id} />
        </>
      )}
    </Panel>
  );
}
