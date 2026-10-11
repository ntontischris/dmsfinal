import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  LEDGER_BACK,
  LEDGER_CLIENTS_EMPTY_TEXT,
  LEDGER_CLIENTS_EMPTY_TITLE,
  LEDGER_CLIENTS_LABEL,
  LEDGER_ERROR_TEXT,
  LEDGER_ERROR_TITLE,
  LEDGER_EYEBROW,
  LEDGER_NO_ACCESS_TEXT,
  LEDGER_PICK_TEXT,
  LEDGER_TITLE,
  LedgerBackLink,
  LedgerBody,
  LedgerClients,
  clientParam,
  financeViewOf,
  getLedger,
  listLedgerClients,
} from "@/modules/finance";

export const metadata = { title: LEDGER_TITLE };

interface LedgerPageProps {
  searchParams: Promise<{ client?: string }>;
}

function LoadError() {
  return (
    <Notice kind="error" title={LEDGER_ERROR_TITLE}>
      <p className="m-0">{LEDGER_ERROR_TEXT}</p>
    </Notice>
  );
}

async function TeamClientList() {
  const clients = await listLedgerClients();
  if (!clients.ok) return <LoadError />;
  if (clients.data.length === 0) {
    return (
      <Notice kind="empty" title={LEDGER_CLIENTS_EMPTY_TITLE}>
        <p className="m-0">{LEDGER_CLIENTS_EMPTY_TEXT}</p>
      </Notice>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-muted-foreground">{LEDGER_PICK_TEXT}</p>
      <section aria-label={LEDGER_CLIENTS_LABEL}>
        <LedgerClients clients={clients.data} />
      </section>
    </div>
  );
}

async function LedgerScreen({
  clientId,
  isClient,
}: {
  clientId?: string;
  isClient: boolean;
}) {
  const ledger = await getLedger(clientId);
  if (!ledger.ok) return <LoadError />;
  return (
    <div className="grid gap-3">
      {!isClient && <LedgerBackLink label={LEDGER_BACK} />}
      <LedgerBody ledger={ledger.data} isClient={isClient} />
    </div>
  );
}

// I5: η Καρτέλα Πελάτη. Η ομάδα (Οικονομικά + ποσά) διαλέγει Πελάτη (?client=)· ο Χρήστης πελάτη με «Βλέπει Οικονομικά» βλέπει τη δική του.
// Η βάση αποφασίζει ποιος βλέπει τι· το «Προς τιμολόγηση» δεν φτάνει ποτέ στον πελάτη.
export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const view = financeViewOf(viewer);
  if (view === "none") {
    return (
      <>
        <ScreenHeader eyebrow={LEDGER_EYEBROW} title={LEDGER_TITLE} />
        <AccessNotice viewer={viewer}>
          <p className="m-0">{LEDGER_NO_ACCESS_TEXT}</p>
        </AccessNotice>
      </>
    );
  }
  const clientId = clientParam(params.client);
  return (
    <>
      <ScreenHeader eyebrow={LEDGER_EYEBROW} title={LEDGER_TITLE} />
      <div className="mt-4">
        {view === "client" || clientId ? (
          <LedgerScreen
            clientId={view === "client" ? undefined : clientId}
            isClient={view === "client"}
          />
        ) : (
          <TeamClientList />
        )}
      </div>
    </>
  );
}
