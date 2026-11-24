import { notFound } from "next/navigation";
import { z } from "zod";

import { getViewer, isClientViewer } from "@/modules/access";
import { SpacesClientInvoice, SpacesInvoice } from "@/modules/finance";

export const metadata = { title: "Τιμολόγιο" };

// I8: ένα Τιμολόγιο με τις πληρωμές του (d3). Η βάση αποφασίζει τι βλέπει ο θεατής.
// Ο Χρήστης πελάτη βλέπει τη δική του όψη (Τ2), μόνο για Τιμολόγιο του δικού του Πελάτη.
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [viewer, raw] = await Promise.all([getViewer(), params]);
  const id = z.uuid().safeParse(raw.id);
  if (!id.success) notFound();
  if (isClientViewer(viewer)) return <SpacesClientInvoice id={id.data} />;
  return <SpacesInvoice id={id.data} />;
}
