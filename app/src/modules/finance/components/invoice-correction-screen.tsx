import Link from "next/link";

import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import {
  INVOICE_BACK,
  INVOICE_CORRECT_NOTE,
  INVOICE_CORRECT_TITLE,
  INVOICE_VOIDED_TEXT,
} from "../invoice-corrections-labels";
import type { InvoiceDetail } from "../invoice-detail-schema";
import { INVOICES_PATH } from "../invoices-helpers";
import { KIND_LABELS } from "../invoices-labels";

import { InvoiceCorrectForm } from "./invoice-correct-form";
import { InvoiceTrail } from "./invoice-trail";
import { InvoiceVoidForm } from "./invoice-void-form";

interface InvoiceCorrectionScreenProps {
  invoice: InvoiceDetail;
}

// I3 με ?invoice=: Ίχνος καταχώρισης, Διόρθωση στοιχείων και Ακύρωση. Ένα ακυρωμένο δείχνει μόνο τον λόγο και το Ίχνος.
export function InvoiceCorrectionScreen({
  invoice,
}: InvoiceCorrectionScreenProps) {
  return (
    <div className="grid gap-4">
      <p className="m-0 text-sm">
        <Link href={INVOICES_PATH} className="text-primary underline">
          {INVOICE_BACK}
        </Link>{" "}
        · {KIND_LABELS[invoice.kind]} {invoice.number} · {invoice.clientName}
        {invoice.creditForNumber && ` · διορθώνει ${invoice.creditForNumber}`}
      </p>
      <InvoiceTrail number={invoice.number} trail={invoice.trail} />
      {invoice.voided !== null && (
        <Notice kind="empty" title={INVOICE_VOIDED_TEXT}>
          <p className="m-0">Λόγος: {invoice.voided.reason}</p>
        </Notice>
      )}
      {invoice.can.correct && (
        <Panel label={INVOICE_CORRECT_TITLE}>
          <div className="grid gap-4">
            <p className="m-0 text-sm text-muted-foreground">
              {INVOICE_CORRECT_NOTE}
            </p>
            <InvoiceCorrectForm invoice={invoice} />
            {invoice.can.void && <InvoiceVoidForm invoiceId={invoice.id} />}
          </div>
        </Panel>
      )}
    </div>
  );
}
