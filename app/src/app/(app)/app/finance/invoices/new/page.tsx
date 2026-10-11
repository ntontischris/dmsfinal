import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  INVOICE_NEW_CONTEXT_ERROR,
  INVOICE_NEW_EYEBROW,
  INVOICE_NEW_NO_ACCESS_TEXT,
  INVOICE_NEW_PICK_TEXT,
  INVOICE_NEW_TITLE,
  INVOICE_DETAIL_ERROR,
  InvoiceClientPicker,
  InvoiceCorrectionScreen,
  InvoiceRegisterForm,
  athensToday,
  financeCaps,
  getInvoiceContext,
  getInvoiceDetail,
  listClientOptions,
} from "@/modules/finance";

export const metadata = { title: INVOICE_NEW_TITLE };

interface NewInvoicePageProps {
  searchParams: Promise<{ client?: string; invoice?: string }>;
}

// I3: Καταχώρηση Τιμολογίου. Ο Πελάτης στη διεύθυνση (?client=), το PDF και τα στοιχεία στη φόρμα (Π3, χωρίς AI).
export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const caps = financeCaps(viewer);
  const header = (
    <ScreenHeader eyebrow={INVOICE_NEW_EYEBROW} title={INVOICE_NEW_TITLE} />
  );
  if (!caps.canView || !caps.canRegisterInvoices) {
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{INVOICE_NEW_NO_ACCESS_TEXT}</p>
        </AccessNotice>
      </>
    );
  }

  const invoiceId = z.uuid().safeParse(params.invoice).data;
  if (invoiceId !== undefined) {
    const detail = await getInvoiceDetail(invoiceId);
    return (
      <>
        {header}
        <div className="mt-4">
          {detail.ok ? (
            <InvoiceCorrectionScreen invoice={detail.data} />
          ) : (
            <Notice kind="error" title={INVOICE_DETAIL_ERROR}>
              <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
            </Notice>
          )}
        </div>
      </>
    );
  }

  const clients = await listClientOptions();
  if (!clients.ok) {
    return (
      <>
        {header}
        <Notice kind="error" title={INVOICE_NEW_CONTEXT_ERROR}>
          <p className="m-0">Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </>
    );
  }

  const clientId = z.uuid().safeParse(params.client).data;
  const ctx = clientId ? await getInvoiceContext(clientId) : null;
  return (
    <>
      {header}
      <div className="mt-4 grid gap-4">
        <InvoiceClientPicker clients={clients.data} selected={clientId ?? ""} />
        {clientId === undefined && (
          <p className="m-0 text-sm text-muted-foreground">
            {INVOICE_NEW_PICK_TEXT}
          </p>
        )}
        {ctx !== null && !ctx.ok && (
          <Notice kind="error" title={INVOICE_NEW_CONTEXT_ERROR}>
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        )}
        {clientId !== undefined && ctx?.ok === true && (
          <InvoiceRegisterForm
            key={clientId}
            clientId={clientId}
            ctx={ctx.data}
            today={athensToday()}
          />
        )}
      </div>
    </>
  );
}
