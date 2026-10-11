import { Field, Input } from "@/components/ui/field";

import { voidInvoice } from "../actions-corrections";
import {
  INVOICE_VOID_BODY,
  INVOICE_VOID_CONFIRM,
  INVOICE_VOID_NOTE,
  INVOICE_VOID_OPEN,
  INVOICE_VOID_PLACEHOLDER,
  INVOICE_VOID_REASON,
  INVOICE_VOID_TITLE,
} from "../invoice-corrections-labels";

import { ActionForm } from "./action-form";

interface InvoiceVoidFormProps {
  invoiceId: string;
}

// Ακύρωση καταχώρισης (Π9): ο λόγος είναι υποχρεωτικός και η ενέργεια θέλει ρητή επιβεβαίωση (δεύτερο κουμπί).
export function InvoiceVoidForm({ invoiceId }: InvoiceVoidFormProps) {
  return (
    <section aria-label={INVOICE_VOID_TITLE} className="grid gap-2">
      <h3 className="m-0 text-base">{INVOICE_VOID_TITLE}</h3>
      <p className="m-0 text-sm text-muted-foreground">{INVOICE_VOID_NOTE}</p>
      <details>
        <summary className="cursor-pointer text-sm">
          {INVOICE_VOID_OPEN}
        </summary>
        <div className="mt-2">
          <ActionForm action={voidInvoice} submitLabel={INVOICE_VOID_CONFIRM}>
            <input type="hidden" name="id" value={invoiceId} />
            <p className="m-0 text-sm">{INVOICE_VOID_BODY}</p>
            <Field label={INVOICE_VOID_REASON}>
              <Input
                name="reason"
                maxLength={500}
                required
                placeholder={INVOICE_VOID_PLACEHOLDER}
              />
            </Field>
          </ActionForm>
        </div>
      </details>
    </section>
  );
}
