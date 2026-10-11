import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  RECEIPTS_EYEBROW,
  RECEIPTS_TITLE,
  RECEIPT_LOAD_ERROR,
  RECEIPT_NOTE,
  RECEIPT_NO_ACCESS,
  ReceiptForm,
  ReceiptList,
  ReceiptsCsvButton,
  financeCaps,
  listClientOptions,
  listPaymentMethods,
  listReceipts,
} from "@/modules/finance";

export const metadata = { title: RECEIPTS_TITLE };

// I4: οι Εισπράξεις. Η λίστα θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· η καταχώρηση και η διόρθωση «Καταχωρεί Εισπράξεις».
// Η βάση ελέγχει κάθε RPC· εδώ μόνο φαίνεται ό,τι δικαιούται ο θεατής.
export default async function ReceiptsPage() {
  const viewer = await getViewer();
  const caps = financeCaps(viewer);
  const header = (
    <ScreenHeader eyebrow={RECEIPTS_EYEBROW} title={RECEIPTS_TITLE} />
  );
  if (!caps.canView)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{RECEIPT_NO_ACCESS}</p>
        </AccessNotice>
      </>
    );

  const [receipts, methods, clients] = await Promise.all([
    listReceipts(),
    listPaymentMethods(),
    caps.canRegister ? listClientOptions() : null,
  ]);
  if (!receipts.ok || !methods.ok)
    return (
      <>
        {header}
        <Notice kind="error" title={RECEIPT_LOAD_ERROR}>
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </>
    );

  return (
    <>
      <ScreenHeader eyebrow={RECEIPTS_EYEBROW} title={RECEIPTS_TITLE}>
        <ReceiptsCsvButton rows={receipts.data} />
      </ScreenHeader>
      <div className="mt-4 grid gap-4">
        {clients?.ok === true && (
          <ReceiptForm clients={clients.data} methods={methods.data} />
        )}
        {clients !== null && !clients.ok && (
          <Notice kind="error" title="Δεν φόρτωσαν οι Πελάτες">
            <p className="m-0">
              Η καταχώρηση δεν είναι διαθέσιμη τώρα. Δοκίμασε ξανά σε λίγο.
            </p>
          </Notice>
        )}
        <p className="m-0 text-sm text-muted-foreground">{RECEIPT_NOTE}</p>
        <ReceiptList rows={receipts.data} methods={methods.data} />
      </div>
    </>
  );
}
