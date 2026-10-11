"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { KIND_LABELS } from "../invoices-labels";
import { dueOf, withNet, type DraftForm } from "../invoices-model";
import {
  INVOICE_KINDS,
  type InvoiceContext,
  type InvoiceKind,
} from "../invoices-view-schema";

interface FieldsProps {
  form: DraftForm;
  ctx: InvoiceContext;
  onChange: (change: Partial<DraftForm>) => void;
  onReplace: (next: DraftForm) => void;
}

// Είδος, αριθμός, ημερομηνίες και «Διορθώνει» (μόνο για πιστωτικό). Η λήξη προσυμπληρώνεται από τις μέρες πληρωμής (Π5).
export function InvoiceIdentityFields({
  form,
  ctx,
  onChange,
}: Omit<FieldsProps, "onReplace">) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Είδος">
        <Select
          name="kind"
          value={form.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as InvoiceKind })
          }
        >
          {INVOICE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Αριθμός">
        <Input
          name="number"
          maxLength={40}
          value={form.number}
          onChange={(event) => onChange({ number: event.target.value })}
        />
      </Field>
      <Field label="Ημερομηνία έκδοσης">
        <Input
          name="issueDate"
          type="date"
          value={form.issueDate}
          onChange={(event) => onChange({ issueDate: event.target.value })}
        />
      </Field>
      {form.kind === "credit" ? (
        <Field label="Διορθώνει το Τιμολόγιο">
          <Select
            name="creditFor"
            value={form.creditFor}
            onChange={(event) => onChange({ creditFor: event.target.value })}
          >
            <option value="">Διάλεξε…</option>
            {ctx.invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.number} ({KIND_LABELS[invoice.kind]})
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label={`Λήξη (προσυμπληρωμένη: ${ctx.paymentDays} μέρες)`}>
          <Input
            name="dueDate"
            type="date"
            value={dueOf(form, ctx.paymentDays)}
            onChange={(event) => onChange({ dueOverride: event.target.value })}
          />
        </Field>
      )}
    </div>
  );
}

// Καθαρό, ΦΠΑ, σύνολο, ΜΑΡΚ και ΑΦΜ του PDF. Το καθαρό προσυμπληρώνει ΦΠΑ και σύνολο με τον συντελεστή του υποδείγματος.
export function InvoiceAmountFields({
  form,
  ctx,
  onChange,
  onReplace,
}: FieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Καθαρό (€)">
        <Input
          name="net"
          inputMode="decimal"
          placeholder="0,00"
          value={form.net}
          onChange={(event) =>
            onReplace(withNet(form, event.target.value, ctx.vatRate))
          }
        />
      </Field>
      <Field
        label={`ΦΠΑ (€) · αναμενόμενο ${String(ctx.vatRate).replace(".", ",")}%`}
      >
        <Input
          name="vat"
          inputMode="decimal"
          placeholder="0,00"
          value={form.vat}
          onChange={(event) =>
            onChange({ vat: event.target.value, autoAmounts: false })
          }
        />
      </Field>
      <Field label="Σύνολο (€)">
        <Input
          name="total"
          inputMode="decimal"
          placeholder="0,00"
          value={form.total}
          onChange={(event) =>
            onChange({ total: event.target.value, autoAmounts: false })
          }
        />
      </Field>
      <Field label="ΜΑΡΚ (προαιρετικό)">
        <Input
          name="mark"
          inputMode="numeric"
          maxLength={20}
          value={form.mark}
          onChange={(event) => onChange({ mark: event.target.value })}
        />
      </Field>
      <Field
        label={`ΑΦΜ στο PDF${ctx.clientTaxId ? ` (Πελάτη: ${ctx.clientTaxId})` : ""}`}
      >
        <Input
          name="pdfTaxId"
          maxLength={40}
          value={form.pdfTaxId}
          onChange={(event) =>
            onChange({ pdfTaxId: event.target.value, taxIdConfirmed: false })
          }
        />
      </Field>
    </div>
  );
}
