"use client";

import type { ReactNode } from "react";

import { KIND_LABELS } from "../invoices-labels";
import { dueOf, withKind, withNet, type DraftForm, type NumberSuggestions } from "../invoices-model";
import { INVOICE_KINDS, type InvoiceContext, type InvoiceKind } from "../invoices-view-schema";

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

// Το μήνυμα της φόρμας (λάθος από τη βάση ή επιτυχία), στη μορφή του prototype.
export function FormFeedback({ error, notice }: { error?: string; notice?: string }) {
  const text = error ?? notice;
  if (!text) return null;
  const isError = error !== undefined;
  return (
    <span
      className="feedback-msg"
      data-tone={isError ? "error" : "ok"}
      data-shown="true"
      role={isError ? "alert" : "status"}
    >
      <span aria-hidden="true">{isError ? "!" : "✓"}</span> {text}
    </span>
  );
}

interface FieldsProps {
  form: DraftForm;
  ctx: InvoiceContext;
  onChange: (change: Partial<DraftForm>) => void;
}

function TextField(props: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "decimal" | "numeric";
  maxLength?: number;
}) {
  return (
    <Field label={props.label}>
      <input
        className="input"
        name={props.name}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
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
        name="creditFor"
        value={form.creditFor}
        onChange={(e) => onChange({ creditFor: e.target.value })}
      >
        <option value="">Διάλεξε…</option>
        {ctx.invoices.map((i) => (
          <option key={i.id} value={i.id}>
            {i.number} ({KIND_LABELS[i.kind]})
          </option>
        ))}
      </select>
    </Field>
  );
}

const isKind = (value: string): value is InvoiceKind => INVOICE_KINDS.some((kind) => kind === value);

// Βήμα «Στοιχεία»: είδος, αριθμός, έκδοση, καθαρό (και για πιστωτικό ποιο διορθώνει). Το καθαρό προσυμπληρώνει
// ΦΠΑ και σύνολο με τον συντελεστή του υποδείγματος.
export function InvoiceFields({
  form,
  ctx,
  onChange,
  onReplace,
  suggestions,
}: FieldsProps & { onReplace: (next: DraftForm) => void; suggestions: NumberSuggestions }) {
  return (
    <div className="i13-fields">
      <Field label="Είδος">
        <select
          className="select"
          name="kind"
          value={form.kind}
          onChange={(e) => {
            if (isKind(e.target.value)) onReplace(withKind(form, e.target.value, suggestions));
          }}
        >
          {INVOICE_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>
      <TextField label="Αριθμός" name="number" maxLength={40} value={form.number} onChange={(number) => onChange({ number })} />
      <TextField
        label="Ημερομηνία έκδοσης"
        name="issueDate"
        type="date"
        value={form.issueDate}
        onChange={(issueDate) => onChange({ issueDate })}
      />
      <TextField
        label="Καθαρό (€)"
        name="net"
        inputMode="decimal"
        value={form.net}
        onChange={(net) => onReplace(withNet(form, net, ctx.vatRate))}
      />
      {form.kind === "credit" && <CreditForSelect form={form} ctx={ctx} onChange={onChange} />}
    </div>
  );
}

// Τα σπάνια πεδία (κλειστό κουτί): λήξη, ΦΠΑ, σύνολο, ΜΑΡΚ, ΑΦΜ του PDF. Το πιστωτικό δεν στέλνει λήξη (όπως η βάση).
export function ExtraFields({ form, ctx, onChange }: FieldsProps) {
  return (
    <div className="i13-fields">
      {form.kind !== "credit" && (
        <TextField
          label={`Λήξη (προσυμπληρωμένη: ${ctx.paymentDays} μέρες)`}
          name="dueDate"
          type="date"
          value={dueOf(form, ctx.paymentDays)}
          onChange={(dueOverride) => onChange({ dueOverride })}
        />
      )}
      <TextField
        label={`ΦΠΑ (€) · αναμενόμενο ${String(ctx.vatRate).replace(".", ",")}%`}
        name="vat"
        inputMode="decimal"
        value={form.vat}
        onChange={(vat) => onChange({ vat, autoAmounts: false })}
      />
      <TextField
        label="Σύνολο (€)"
        name="total"
        inputMode="decimal"
        value={form.total}
        onChange={(total) => onChange({ total, autoAmounts: false })}
      />
      <TextField
        label="ΜΑΡΚ (προαιρετικό)"
        name="mark"
        inputMode="numeric"
        maxLength={20}
        value={form.mark}
        onChange={(mark) => onChange({ mark })}
      />
      <TextField
        label={`ΑΦΜ στο PDF${ctx.clientTaxId ? ` (Πελάτη: ${ctx.clientTaxId})` : ""}`}
        name="pdfTaxId"
        maxLength={40}
        value={form.pdfTaxId}
        onChange={(pdfTaxId) => onChange({ pdfTaxId, taxIdConfirmed: false })}
      />
    </div>
  );
}
