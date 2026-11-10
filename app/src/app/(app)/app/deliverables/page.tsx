import { getViewer, isClientViewer } from "@/modules/access";
import { SpacesClientDeliverables, SpacesDeliverables } from "@/modules/deliverables";

export const metadata = { title: "Παραδοτέα" };

// H1: η ουρά των Παραδοτέων. Η καρτέλα είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
// Ο Χρήστης πελάτη βλέπει την H3.
export default async function DeliverablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (isClientViewer(viewer)) return <SpacesClientDeliverables viewer={viewer} />;
  return <SpacesDeliverables query={await searchParams} />;
}
