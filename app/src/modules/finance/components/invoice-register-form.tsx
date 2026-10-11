"use client";

import { useCallback, useMemo, useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { registerInvoice } from "../actions-invoices";
import {
  INVOICE_EMAIL_NOTE,
  INVOICE_SUBMIT,
  INVOICE_TAX_CONFIRM,
} from "../invoices-labels";
import {
  amountOf,
  canSubmit,
  emptyDraft,
  hasTaxMismatch,
  warningsOf,
  type DraftForm,
} from "../invoices-model";
import type { InvoiceContext } from "../invoices-view-schema";

import { ActionForm } from "./action-form";
import { InvoiceCoverage } from "./invoice-coverage";
import { InvoiceAmountFields, InvoiceIdentityFields } from "./invoice-fields";
import { InvoiceWarnings } from "./invoice-warnings";

interface InvoiceRegisterFormProps {
  clientId: string;
  ctx: InvoiceContext;
  today: string;
}

// Η Καταχώρηση (I3): Βήμα 1 ανέβασμα PDF (χωρίς AI, Π3), Βήμα 2 στοιχεία με προειδοποιήσεις, δεξιά η κάλυψη των Τιμολογητέων.
export function InvoiceRegisterForm({
  clientId,
  ctx,
  today,
}: InvoiceRegisterFormProps) {
  const empty = useMemo(() => emptyDraft(today), [today]);
  const [form, setForm] = useState<DraftForm>(empty);
  const [fileName, setFileName] = useState("");
  const handleChange = (change: Partial<DraftForm>) =>
    setForm((previous) => ({ ...previous, ...change }));
  const handleSuccess = useCallback(() => {
    setForm(empty);
    setFileName("");
  }, [empty]);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <ActionForm
        action={registerInvoice}
        submitLabel={INVOICE_SUBMIT}
        resetOnSuccess
        onSuccess={handleSuccess}
        isDisabled={!canSubmit(form, ctx, fileName !== "")}
      >
        <input type="hidden" name="clientId" value={clientId} />
        <Panel label="Βήμα 1: Ανέβασμα PDF">
          <Field
            label="PDF του Τιμολογίου"
            hint="Έως 10 MB. Τα στοιχεία τα γράφεις στο επόμενο βήμα."
          >
            <Input
              name="pdf"
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name ?? "")
              }
            />
          </Field>
        </Panel>
        <Panel label="Βήμα 2: Στοιχεία">
          <div className="grid gap-4">
            <InvoiceIdentityFields
              form={form}
              ctx={ctx}
              onChange={handleChange}
            />
            <InvoiceAmountFields
              form={form}
              ctx={ctx}
              onChange={handleChange}
              onReplace={setForm}
            />
            <InvoiceWarnings warnings={warningsOf(form, ctx)} />
            {hasTaxMismatch(form, ctx) && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="taxIdConfirmed"
                  checked={form.taxIdConfirmed}
                  onChange={(event) =>
                    handleChange({ taxIdConfirmed: event.target.checked })
                  }
                />
                <span>{INVOICE_TAX_CONFIRM}</span>
              </label>
            )}
            <p className="m-0 text-sm text-muted-foreground">
              {INVOICE_EMAIL_NOTE}
            </p>
          </div>
        </Panel>
      </ActionForm>
      <InvoiceCoverage
        open={ctx.openBillables}
        net={amountOf(form.net)}
        isCredit={form.kind === "credit"}
        toInvoice={ctx.toInvoice}
      />
    </div>
  );
}
