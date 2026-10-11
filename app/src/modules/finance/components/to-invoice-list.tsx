import { Notice } from "@/components/ui/notice";

import { BILLABLES_EMPTY_TEXT, BILLABLES_EMPTY_TITLE } from "../billables-labels";
import { sortClientsByOldest } from "../billables-helpers";
import type { BillableClient } from "../billables-view-schema";

import { ToInvoiceClient } from "./to-invoice-client";

interface ToInvoiceListProps {
  clients: readonly BillableClient[];
  canRegisterInvoices: boolean;
}

// Η λίστα «Προς τιμολόγηση»: ένας Πελάτης ανά κάρτα, οι παλαιότεροι πρώτα.
export function ToInvoiceList({ clients, canRegisterInvoices }: ToInvoiceListProps) {
  if (clients.length === 0) {
    return (
      <Notice kind="empty" title={BILLABLES_EMPTY_TITLE}>
        <p className="m-0">{BILLABLES_EMPTY_TEXT}</p>
      </Notice>
    );
  }
  return (
    <div className="grid gap-3">
      {sortClientsByOldest(clients).map((client) => (
        <ToInvoiceClient key={client.clientId} client={client} canRegisterInvoices={canRegisterInvoices} />
      ))}
    </div>
  );
}
