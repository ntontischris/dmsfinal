import { Notice } from "@/components/ui/notice";

import { BILLABLES_EMPTY_TEXT, BILLABLES_EMPTY_TITLE } from "../labels";
import { sortClientsByOldest } from "../helpers";
import type { BillableClient } from "../view-schema";

import { ToInvoiceClient } from "./to-invoice-client";

interface ToInvoiceListProps {
  clients: readonly BillableClient[];
}

// Η λίστα «Προς τιμολόγηση»: ένας Πελάτης ανά κάρτα, οι παλαιότεροι πρώτα.
export function ToInvoiceList({ clients }: ToInvoiceListProps) {
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
        <ToInvoiceClient key={client.clientId} client={client} />
      ))}
    </div>
  );
}
