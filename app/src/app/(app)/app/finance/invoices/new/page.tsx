import { z } from "zod";

import { INVOICE_NEW_TITLE, SpacesNewInvoice } from "@/modules/finance";

export const metadata = { title: INVOICE_NEW_TITLE };

interface NewInvoicePageProps {
  searchParams: Promise<{ client?: string; invoice?: string }>;
}

// I3: Καταχώρηση Τιμολογίου (Χώροι). Ο Πελάτης στη διεύθυνση (?client=), το PDF και τα στοιχεία στη φόρμα (Π3, χωρίς AI).
// Με ?invoice= το Ίχνος και η Διόρθωση/Ακύρωση της καταχώρισης.
export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const params = await searchParams;
  return (
    <SpacesNewInvoice
      query={{
        clientId: z.uuid().safeParse(params.client).data,
        invoiceId: z.uuid().safeParse(params.invoice).data,
      }}
    />
  );
}
