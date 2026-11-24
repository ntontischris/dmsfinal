"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { correctInvoice, voidInvoice } from "../actions-corrections";
import { INVOICE_VOID_BODY } from "../invoice-corrections-labels";
import type { InvoiceDetail } from "../invoice-detail-schema";
import { decimalText } from "../money";
import { Field, FormFeedback } from "./i3-fields";
import { Box, Fold, Step } from "./i3-parts";

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

const MAIN_KEYS: readonly (keyof CorrectInvoice)[] = ["number", "issueDate", "dueDate"];
const MONEY_KEYS: readonly (keyof CorrectInvoice)[] = ["net", "vat", "total", "mark"];

function KeyFields(props: {
  keys: readonly (keyof CorrectInvoice)[];
  value: CorrectInvoice;
  hasDue: boolean;
  onChange: (value: CorrectInvoice) => void;
}) {
  return (
    <div className="i13-fields">
      {props.keys
        .filter((key) => key !== "dueDate" || props.hasDue)
        .map((key) => (
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
    </div>
  );
}

const moneyHint = (value: CorrectInvoice): string =>
  `καθαρό ${value.net} · ΦΠΑ ${value.vat} · σύνολο ${value.total}${value.mark ? ` · ΜΑΡΚ ${value.mark}` : ""}`;

function CorrectForm({ invoice }: { invoice: InvoiceDetail }) {
  const original = correctionOf(invoice);
  const [value, setValue] = useState(original);
  const { state, isPending, onSubmit, formRef } = useKeptForm(correctInvoice);
  const hasDue = invoice.dueDate !== null;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="i3-form">
      <input type="hidden" name="id" value={invoice.id} />
      {!hasDue && <input type="hidden" name="dueDate" value="" />}
      <KeyFields keys={MAIN_KEYS} value={value} hasDue={hasDue} onChange={setValue} />
      <Fold title="Ποσά και ΜΑΡΚ" hint={moneyHint(value)}>
        <KeyFields keys={MONEY_KEYS} value={value} hasDue={hasDue} onChange={setValue} />
      </Fold>
      <Field label="Λόγος διόρθωσης (προαιρετικός)">
        <input className="input" name="reason" maxLength={500} />
      </Field>
      <p className="i3-actions">
        <button type="submit" className="i3-go" disabled={!isChanged(original, value) || isPending}>
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
    <form ref={formRef} onSubmit={onSubmit} className="i3-form">
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
      <p className="ml-actions">
        <button type="submit" data-danger disabled={reason.trim() === "" || isPending}>
          Ακύρωση καταχώρισης
        </button>{" "}
        <FormFeedback error={state.error} notice={state.notice} />
      </p>
    </form>
  );
}

// Διόρθωση (βήμα) και ακύρωση (κλειστό κουτί) πάνω στις πραγματικές ενέργειες correctInvoice / voidInvoice.
// Η βάση λέει τι επιτρέπεται (can.correct, can.void).
export function I3Correct({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <>
      <Step no={1} title="Διόρθωση στοιχείων" hint="Άλλαξε ό,τι γράφτηκε λάθος και αποθήκευσε. Δεν στέλνει email.">
        <CorrectForm invoice={invoice} />
      </Step>
      {invoice.can.void && (
        <Box title="Ακύρωση καταχώρισης" hint="Μόνο αν δεν έπρεπε να μπει καθόλου · θέλει λόγο">
          <p className="muted">
            Φεύγει από την Καρτέλα και τα σύνολα. Ο πελάτης δεν τη βλέπει· η ομάδα τη βλέπει ως «ακυρώθηκε» με τον
            λόγο. Δεν στέλνει email.
          </p>
          <VoidForm invoiceId={invoice.id} />
        </Box>
      )}
    </>
  );
}
