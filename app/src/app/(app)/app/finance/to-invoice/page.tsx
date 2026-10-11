import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  BILLABLES_ERROR_TEXT,
  BILLABLES_ERROR_TITLE,
  BILLABLES_EYEBROW,
  BILLABLES_NOTE,
  BILLABLES_NO_ACCESS_TEXT,
  BILLABLES_TITLE,
  ToInvoiceList,
  ToInvoiceTotals,
  financeCaps,
  getBillables,
} from "@/modules/finance";

export const metadata = { title: BILLABLES_TITLE };

// I1: τι περιμένει τιμολόγηση, ανά Πελάτη. Εσωτερική υπενθύμιση, όχι οφειλή· η βάση αποφασίζει τι βλέπεις.
export default async function ToInvoicePage() {
  const viewer = await getViewer();
  if (!financeCaps(viewer).canView) {
    return (
      <>
        <ScreenHeader eyebrow={BILLABLES_EYEBROW} title={BILLABLES_TITLE} />
        <AccessNotice viewer={viewer}>
          <p className="m-0">{BILLABLES_NO_ACCESS_TEXT}</p>
        </AccessNotice>
      </>
    );
  }

  const billables = await getBillables();
  return (
    <>
      <ScreenHeader eyebrow={BILLABLES_EYEBROW} title={BILLABLES_TITLE} />
      {!billables.ok ? (
        <Notice kind="error" title={BILLABLES_ERROR_TITLE}>
          <p className="m-0">{BILLABLES_ERROR_TEXT}</p>
        </Notice>
      ) : (
        <div className="mt-4 grid gap-4">
          <p className="m-0 text-sm text-muted-foreground">{BILLABLES_NOTE}</p>
          <ToInvoiceTotals view={billables.data} />
          <ToInvoiceList clients={billables.data.clients} />
        </div>
      )}
    </>
  );
}
