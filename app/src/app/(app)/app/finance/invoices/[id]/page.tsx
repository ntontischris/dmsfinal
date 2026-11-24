import { notFound } from "next/navigation";
import { z } from "zod";

import { SpacesInvoice } from "@/modules/finance";

export const metadata = { title: "Τιμολόγιο" };

// I8: ένα Τιμολόγιο με τις πληρωμές του (d3). Η βάση αποφασίζει τι βλέπει ο θεατής.
// ?remind=1 ανοίγει το κουτί «Στείλε υπενθύμιση» (από τη γραμμή ληξιπρόθεσμου στη λίστα).
export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ remind?: string | string[] }>;
}) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const { remind } = await searchParams;
  return <SpacesInvoice id={id.data} isReminderOpen={remind === "1"} />;
}
