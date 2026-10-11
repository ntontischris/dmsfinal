import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import {
  CLIENT_INVOICES_EMPTY_TEXT,
  CLIENT_INVOICES_EMPTY_TITLE,
  CLIENT_INVOICES_EYEBROW,
  ClientInvoiceTable,
  INVOICES_ERROR_TEXT,
  INVOICES_ERROR_TITLE,
  INVOICES_TITLE,
  getClientInvoices,
} from "@/modules/finance";

// Η όψη του Χρήστη πελάτη για τα Τιμολόγια (I2): μόνο τα δικά του, με PDF. Χωρίς σύνολα, στήλη Πελάτη, καταχώρηση ή ακυρωμένα.
export async function ClientInvoicesScreen() {
  const invoices = await getClientInvoices();
  return (
    <>
      <ScreenHeader eyebrow={CLIENT_INVOICES_EYEBROW} title={INVOICES_TITLE} />
      <div className="mt-4">
        {!invoices.ok ? (
          <Notice kind="error" title={INVOICES_ERROR_TITLE}>
            <p className="m-0">{INVOICES_ERROR_TEXT}</p>
          </Notice>
        ) : invoices.data.items.length === 0 ? (
          <Notice kind="empty" title={CLIENT_INVOICES_EMPTY_TITLE}>
            <p className="m-0">{CLIENT_INVOICES_EMPTY_TEXT}</p>
          </Notice>
        ) : (
          <ClientInvoiceTable rows={invoices.data.items} />
        )}
      </div>
    </>
  );
}
