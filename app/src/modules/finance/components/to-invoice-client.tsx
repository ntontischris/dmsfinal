import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { COLUMN_LABELS } from "../billables-labels";
import {
  daysText,
  formatBillableDate,
  formatMoney,
  reasonText,
  sortItemsByDate,
} from "../billables-helpers";
import type { BillableClient, BillableItem } from "../billables-view-schema";
import { newInvoiceHref } from "../invoices-helpers";
import { INVOICES_CTA } from "../invoices-labels";

import { ToInvoiceReminders } from "./to-invoice-reminders";

interface ToInvoiceClientProps {
  client: BillableClient;
  canRegisterInvoices: boolean;
}

// Κάρτα ανά Πελάτη: η σύνοψη ανοίγει τον πίνακα των Τιμολογητέων του (κάρτες στο κινητό).
export function ToInvoiceClient({ client, canRegisterInvoices }: ToInvoiceClientProps) {
  const items = sortItemsByDate(client.items);
  return (
    <details className="rounded-md border bg-card">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
        <span className="font-medium">{client.clientName}</span>
        <span className="tabular-nums">
          {formatMoney(client.open)} προς τιμολόγηση
        </span>
        <span className="text-sm text-muted-foreground">
          {client.count} Τιμολογητέα
          {client.count > 0 && ` · παλαιότερο ${daysText(client.oldestDays)}`}
        </span>
        {client.beyond > 0 && (
          <Badge tone="attention">
            τιμολογήθηκε πέρα από τα Τιμολογητέα κατά{" "}
            {formatMoney(client.beyond)}
          </Badge>
        )}
        {canRegisterInvoices && (
          <Link
            href={newInvoiceHref(client.clientId)}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            {INVOICES_CTA}
          </Link>
        )}
      </summary>
      <div className="hidden p-3 pt-0 md:block">
        <ClientTable items={items} />
      </div>
      <div className="grid gap-2 p-3 pt-0 md:hidden">
        {items.map((item) => (
          <ClientCard key={item.id} item={item} />
        ))}
      </div>
    </details>
  );
}

function ClientTable({ items }: { items: readonly BillableItem[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMN_LABELS.date}</Th>
          <Th>{COLUMN_LABELS.agreement}</Th>
          <Th>{COLUMN_LABELS.reason}</Th>
          <Th isNumeric>{COLUMN_LABELS.net}</Th>
          <Th>{COLUMN_LABELS.days}</Th>
          <Th>{COLUMN_LABELS.reminders}</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <Tr key={item.id}>
            <Td data-label={COLUMN_LABELS.date}>
              {formatBillableDate(item.billableOn)}
            </Td>
            <Td data-label={COLUMN_LABELS.agreement}>{item.agreementTitle}</Td>
            <Td data-label={COLUMN_LABELS.reason}>
              <span className="block">{reasonText(item.reason)}</span>
              <span className="block text-xs text-muted-foreground">
                {item.label}
              </span>
            </Td>
            <Td data-label={COLUMN_LABELS.net} isNumeric>
              {formatMoney(item.net)}
              {item.open < item.net && (
                <span className="block text-xs text-muted-foreground">
                  ανοιχτό {formatMoney(item.open)}
                </span>
              )}
            </Td>
            <Td data-label={COLUMN_LABELS.days}>{daysText(item.daysOpen)}</Td>
            <Td data-label={COLUMN_LABELS.reminders}>
              <ToInvoiceReminders days={item.reminders} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

function ClientCard({ item }: { item: BillableItem }) {
  return (
    <article className="grid gap-2 rounded-md border p-3">
      <p className="m-0 font-medium">
        {reasonText(item.reason)} · {formatMoney(item.net)}
      </p>
      <p className="m-0 text-sm text-muted-foreground">
        {item.agreementTitle} · {formatBillableDate(item.billableOn)}
      </p>
      <p className="m-0 text-sm">{item.label}</p>
      <p className="m-0 text-sm text-muted-foreground">
        {daysText(item.daysOpen)} ανοιχτό
      </p>
      <ToInvoiceReminders days={item.reminders} />
    </article>
  );
}
