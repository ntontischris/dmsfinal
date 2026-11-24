import { getViewer } from "@/modules/access";
import {
  INVOICES_TITLE,
  SpacesClientInvoices,
  SpacesInvoices,
  financeViewOf,
  parseInvoiceFilter,
} from "@/modules/finance";

export const metadata = { title: INVOICES_TITLE };

interface InvoicesPageProps {
  searchParams: Promise<{ filter?: string; client?: string; month?: string }>;
}

// I2: τα Τιμολόγια (Χώροι). Ο Χρήστης πελάτη με «Βλέπει Οικονομικά» βλέπει τη δική του όψη. Η ομάδα θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· η καταχώρηση θέλει «Καταχωρεί Τιμολόγια».
// Τα φίλτρα ζουν στη διεύθυνση· η βάση αποφασίζει τι βλέπεις και υπολογίζει καταστάσεις και σύνολα.
export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const filter = parseInvoiceFilter(params.filter);
  if (financeViewOf(viewer) === "client")
    return <SpacesClientInvoices query={{ filter, month: params.month }} />;
  return (
    <SpacesInvoices
      query={{ filter, client: params.client, month: params.month }}
    />
  );
}
