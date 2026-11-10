import { getViewer } from "@/modules/access";
import {
  LEDGER_TITLE,
  SpacesClientLedger,
  SpacesLedger,
  clientParam,
  financeViewOf,
} from "@/modules/finance";

export const metadata = { title: LEDGER_TITLE };

interface LedgerPageProps {
  searchParams: Promise<{ client?: string }>;
}

// I5: η Καρτέλα Πελάτη (Χώροι). Η ομάδα (Οικονομικά + ποσά) διαλέγει Πελάτη (?client=)· ο Χρήστης πελάτη με «Βλέπει Οικονομικά» βλέπει τη δική του.
// Η βάση αποφασίζει ποιος βλέπει τι· το «Προς τιμολόγηση» δεν φτάνει ποτέ στον πελάτη.
export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  return financeViewOf(viewer) === "client" ? (
    <SpacesClientLedger />
  ) : (
    <SpacesLedger clientId={clientParam(params.client)} />
  );
}
