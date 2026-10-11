import { Field, Input } from "@/components/ui/field";

import { correctInvoice } from "../actions-corrections";
import {
  FIELD_LABELS,
  INVOICE_CORRECT_HEADING,
  INVOICE_CORRECT_REASON,
  INVOICE_CORRECT_SUBMIT,
} from "../invoice-corrections-labels";
import type { InvoiceDetail } from "../invoice-detail-schema";
import { decimalText } from "../money";

import { ActionForm } from "./action-form";

interface InvoiceCorrectFormProps {
  invoice: InvoiceDetail;
}

// Διόρθωση στοιχείων (Π8): αριθμός, ημερομηνίες, ποσά, ΜΑΡΚ. Το κουμπί φαίνεται μόνο όταν κάτι αλλάξει.
// Το πιστωτικό δεν έχει λήξη. Ο λόγος είναι προαιρετικός και γράφεται στο Ίχνος.
export function InvoiceCorrectForm({ invoice }: InvoiceCorrectFormProps) {
  return (
    <section aria-label={INVOICE_CORRECT_HEADING} className="grid gap-2">
      <h3 className="m-0 text-base">{INVOICE_CORRECT_HEADING}</h3>
      <ActionForm
        action={correctInvoice}
        submitLabel={INVOICE_CORRECT_SUBMIT}
        onlyWhenChanged
      >
        <input type="hidden" name="id" value={invoice.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={FIELD_LABELS.number}>
            <Input name="number" maxLength={40} defaultValue={invoice.number} />
          </Field>
          <Field label={FIELD_LABELS.issueDate}>
            <Input
              name="issueDate"
              type="date"
              defaultValue={invoice.issueDate}
            />
          </Field>
          {invoice.dueDate !== null && (
            <Field label={FIELD_LABELS.dueDate}>
              <Input
                name="dueDate"
                type="date"
                defaultValue={invoice.dueDate}
              />
            </Field>
          )}
          <Field label={FIELD_LABELS.net}>
            <Input
              name="net"
              inputMode="decimal"
              defaultValue={decimalText(invoice.net)}
            />
          </Field>
          <Field label={FIELD_LABELS.vat}>
            <Input
              name="vat"
              inputMode="decimal"
              defaultValue={decimalText(invoice.vat)}
            />
          </Field>
          <Field label={FIELD_LABELS.total}>
            <Input
              name="total"
              inputMode="decimal"
              defaultValue={decimalText(invoice.total)}
            />
          </Field>
          <Field label={FIELD_LABELS.mark}>
            <Input
              name="mark"
              inputMode="numeric"
              maxLength={20}
              defaultValue={invoice.mark ?? ""}
            />
          </Field>
          <Field label={INVOICE_CORRECT_REASON}>
            <Input name="reason" maxLength={500} />
          </Field>
        </div>
      </ActionForm>
    </section>
  );
}
