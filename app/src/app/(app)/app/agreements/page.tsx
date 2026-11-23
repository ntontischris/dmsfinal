import { getViewer } from "@/modules/access";
import {
  SpacesAgreements,
  SpacesClientAgreements,
  agreementCaps,
} from "@/modules/agreements";
import { WithClientsDeck } from "@/modules/sales";

export const metadata = { title: "Συμφωνίες" };

// D1: οι Συμφωνίες που βλέπει ο χρήστης. Ο Χρήστης πελάτη έχει τη δική του όψη.
export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [viewer, { view }] = await Promise.all([getViewer(), searchParams]);
  if (agreementCaps(viewer).isClient) return <SpacesClientAgreements />;
  return (
    <WithClientsDeck active="D1">
      <SpacesAgreements view={view} />
    </WithClientsDeck>
  );
}
