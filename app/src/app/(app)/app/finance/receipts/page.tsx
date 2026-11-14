import { z } from "zod";

import { RECEIPTS_TITLE, SpacesReceipts } from "@/modules/finance";

export const metadata = { title: RECEIPTS_TITLE };

interface ReceiptsPageProps {
  searchParams: Promise<{ client?: string; invoice?: string }>;
}

// I4: οι Εισπράξεις (Χώροι). Η λίστα θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· η καταχώρηση και η διόρθωση «Καταχωρεί Εισπράξεις».
// Η βάση ελέγχει κάθε RPC· εδώ μόνο φαίνεται ό,τι δικαιούται ο θεατής. Με ?client=&invoice= η φόρμα ανοίγει έτοιμη.
export default async function ReceiptsPage({ searchParams }: ReceiptsPageProps) {
  const params = await searchParams;
  return (
    <SpacesReceipts
      query={{
        clientId: z.uuid().safeParse(params.client).data,
        invoiceId: z.uuid().safeParse(params.invoice).data,
      }}
    />
  );
}
