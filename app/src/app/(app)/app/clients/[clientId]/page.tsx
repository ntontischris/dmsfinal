import { parseClientSendsFilter } from "@/modules/notifications";
import { SpacesClient } from "@/modules/sales";

export const metadata = { title: "Πελάτης" };

// B2: η Σελίδα Πελάτη με τις καρτέλες της. Η πρόσβαση αποφασίζεται στη βάση.
export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string; state?: string; channel?: string }>;
}) {
  const [{ clientId }, query] = await Promise.all([params, searchParams]);
  return (
    <SpacesClient
      clientId={clientId}
      tab={typeof query.tab === "string" ? query.tab : undefined}
      sendsFilter={parseClientSendsFilter(query)}
    />
  );
}
