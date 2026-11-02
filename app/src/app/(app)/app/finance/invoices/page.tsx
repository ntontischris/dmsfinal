import Link from "next/link";

import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { buttonVariants } from "@/components/ui/button";
import { AccessNotice, getViewer, isClientViewer } from "@/modules/access";
import {
  CLIENT_INVOICES_NO_ACCESS_TEXT,
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
  SpacesClientInvoices,
  SpacesInvoices,
  VoidedInvoicesCard,
  financeCaps,
  financeViewOf,
  getInvoices,
  getVoidedInvoices,
  newInvoiceHref,
  parseInvoiceFilter,
} from "@/modules/finance";

import { ClientInvoicesScreen } from "./client-screen";

export const metadata = { title: INVOICES_TITLE };

interface InvoicesPageProps {
  searchParams: Promise<{ filter?: string; client?: string; month?: string }>;
}

// I2: τα Τιμολόγια. Ο Χρήστης πελάτη με «Βλέπει Οικονομικά» βλέπει τη δική του όψη. Η ομάδα θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· η καταχώρηση θέλει «Καταχωρεί Τιμολόγια».
// Το φίλτρο ζει στη διεύθυνση· η βάση αποφασίζει τι βλέπεις και υπολογίζει καταστάσεις και σύνολα.
export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  // Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype, για τον πελάτη και για την ομάδα· αλλιώς η σημερινή.
  const look = await lookOf(viewer);
  if (financeViewOf(viewer) === "client")
    return look === "spaces" ? (
      <SpacesClientInvoices
        query={{ filter: parseInvoiceFilter(params.filter), month: params.month }}
      />
    ) : (
      <ClientInvoicesScreen />
    );
  if (look === "spaces")
    return (
      <SpacesInvoices
        query={{
          filter: parseInvoiceFilter(params.filter),
          client: params.client,
          month: params.month,
        }}
      />
    );
  const caps = financeCaps(viewer);
  if (!caps.canView) {
    return (
      <>
        <ScreenHeader eyebrow={INVOICES_EYEBROW} title={INVOICES_TITLE} />
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            {isClientViewer(viewer)
              ? CLIENT_INVOICES_NO_ACCESS_TEXT
              : INVOICES_NO_ACCESS_TEXT}
          </p>
        </AccessNotice>
      </>
    );
  }

  const filter = parseInvoiceFilter(params.filter);
  const [invoices, voided] = await Promise.all([
    getInvoices(filter),
    filter === "all" ? getVoidedInvoices() : Promise.resolve(null),
  ]);
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
          <Link
            href={newInvoiceHref()}
            className={buttonVariants({ variant: "primary" })}
          >
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
          <InvoiceTable rows={items} canCorrect={caps.canRegisterInvoices} />
        )}
        {voided?.ok === true && <VoidedInvoicesCard items={voided.data} />}
      </div>
    </>
  );
}
