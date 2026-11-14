import { notFound } from "next/navigation";
import { z } from "zod";

import { SpacesInvoice } from "@/modules/finance";

export const metadata = { title: "Τιμολόγιο" };

// I8: ένα Τιμολόγιο με τις πληρωμές του (d3). Η βάση αποφασίζει τι βλέπει ο θεατής.
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  return <SpacesInvoice id={id.data} />;
}
