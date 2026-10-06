"use client";

import type { ReactNode } from "react";

import type { InvoiceKind } from "@/data/finance";
import { dueOf, type FormState, type I3Context } from "@/screens/i3-model";

import "./i13.css";

const KINDS: readonly InvoiceKind[] = ["τιμολόγιο", "απόδειξη", "πιστωτικό"];

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="i13-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

interface FieldsProps {
  form: FormState;
  ctx: I3Context;
  onChange: (change: Partial<FormState>) => void;
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Field label={props.label}>
      <input
        className="input"
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

function CreditForSelect({ form, ctx, onChange }: FieldsProps) {
  return (
    <Field label="Διορθώνει το Τιμολόγιο">
      <select
        className="select"
        value={form.creditFor}
        onChange={(e) => onChange({ creditFor: e.target.value })}
      >
        <option value="">Διάλεξε…</option>
        {ctx.invoices.map((i) => (
          <option key={i.id} value={i.id}>
            {i.number} ({i.kind})
          </option>
        ))}
      </select>
    </Field>
  );
}

export function InvoiceFields({ form, ctx, onChange }: FieldsProps) {
  return (
    <div className="i13-fields">
      <Field label="Είδος">
        <select
          className="select"
          value={form.kind}
          onChange={(e) => onChange({ kind: e.target.value as InvoiceKind })}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
      <TextField
        label="Αριθμός"
        value={form.number}
        onChange={(number) => onChange({ number })}
      />
      <TextField
        label="Ημερομηνία έκδοσης"
        type="date"
        value={form.issueDate}
        onChange={(issueDate) => onChange({ issueDate })}
      />
      <TextField
        label={`Λήξη (προσυμπληρωμένη: ${ctx.paymentDays} μέρες)`}
        type="date"
        value={dueOf(form, ctx.paymentDays)}
        onChange={(dueOverride) => onChange({ dueOverride })}
      />
      {form.kind === "πιστωτικό" && (
        <CreditForSelect form={form} ctx={ctx} onChange={onChange} />
      )}
    </div>
  );
}

export function AmountFields({ form, ctx, onChange }: FieldsProps) {
  return (
    <div className="i13-fields">
      <TextField
        label="Καθαρό (€)"
        value={form.net}
        onChange={(net) => onChange({ net })}
      />
      <TextField
        label="ΦΠΑ (€)"
        value={form.vat}
        onChange={(vat) => onChange({ vat })}
      />
      <TextField
        label="Σύνολο (€)"
        value={form.total}
        onChange={(total) => onChange({ total })}
      />
      <TextField
        label="ΜΑΡΚ (προαιρετικό)"
        value={form.mark}
        onChange={(mark) => onChange({ mark })}
      />
      <TextField
        label={`ΑΦΜ στο PDF (Πελάτη: ${ctx.clientVat})`}
        value={form.pdfVat}
        onChange={(pdfVat) => onChange({ pdfVat, vatConfirmed: false })}
      />
    </div>
  );
}
