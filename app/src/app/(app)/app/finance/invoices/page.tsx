import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { buttonVariants } from "@/components/ui/button";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  INVOICES_CTA,
  INVOICES_EMPTY_TEXT,
  INVOICES_EMPTY_TITLE,
  INVOICES_ERROR_TEXT,
  INVOICES_ERROR_TITLE,
  INVOICES_EYEBROW,
  INVOICES_NO_ACCESS_TEXT,
  INVOICES_TITLE,
  InvoiceCsvButton,
  InvoiceFilterTabs,
  InvoiceTable,
  InvoiceTotals,
  financeCaps,
  getInvoices,
  newInvoiceHref,
  parseInvoiceFilter,
} from "@/modules/finance";

export const metadata = { title: INVOICES_TITLE };

interface InvoicesPageProps {
  searchParams: Promise<{ filter?: string }>;
}

// I2: τα Τιμολόγια. Θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· η καταχώρηση θέλει «Καταχωρεί Τιμολόγια».
// Το φίλτρο ζει στη διεύθυνση· η βάση αποφασίζει τι βλέπεις και υπολογίζει καταστάσεις και σύνολα.
export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const caps = financeCaps(viewer);
  if (!caps.canView) {
    return (
      <>
        <ScreenHeader eyebrow={INVOICES_EYEBROW} title={INVOICES_TITLE} />
        <AccessNotice viewer={viewer}>
          <p className="m-0">{INVOICES_NO_ACCESS_TEXT}</p>
        </AccessNotice>
      </>
    );
  }

  const filter = parseInvoiceFilter(params.filter);
  const invoices = await getInvoices(filter);
  if (!invoices.ok) {
    return (
      <>
        <ScreenHeader eyebrow={INVOICES_EYEBROW} title={INVOICES_TITLE} />
        <Notice kind="error" title={INVOICES_ERROR_TITLE}>
          <p className="m-0">{INVOICES_ERROR_TEXT}</p>
        </Notice>
      </>
    );
  }

  const { totals, counts, items } = invoices.data;
  return (
    <>
      <ScreenHeader eyebrow={INVOICES_EYEBROW} title={INVOICES_TITLE}>
        {caps.canRegisterInvoices && (
          <Link href={newInvoiceHref()} className={buttonVariants({ variant: "primary" })}>
            {INVOICES_CTA}
          </Link>
        )}
        <InvoiceCsvButton rows={items} />
      </ScreenHeader>
      <div className="mt-4 grid gap-4">
        <InvoiceTotals totals={totals} />
        <div>
          <InvoiceFilterTabs current={filter} counts={counts} />
        </div>
        {items.length === 0 ? (
          <Notice kind="empty" title={INVOICES_EMPTY_TITLE}>
            <p className="m-0">{INVOICES_EMPTY_TEXT}</p>
          </Notice>
        ) : (
          <InvoiceTable rows={items} />
        )}
      </div>
    </>
  );
}
