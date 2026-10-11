import { Panel, StatGrid } from "@/components/ui/panel";
import Link from "next/link";

import { formatMoney } from "../billables-helpers";
import { balanceLabel, balanceText } from "../ledger-helpers";
import {
  OVERDUE_BADGE,
  OVERDUE_LABEL,
  PAYMENT_BANK,
  PAYMENT_HOLDER,
  PAYMENT_IBAN,
  PAYMENT_TITLE,
  TO_INVOICE_LINK,
  TO_INVOICE_NOTE,
  TO_INVOICE_TITLE,
} from "../ledger-labels";
import type { LedgerView } from "../ledger-view-schema";

interface BalanceCardsProps {
  balance: number;
  overdue: number;
  isClient: boolean;
}

// Δύο κάρτες: υπόλοιπο (με ετικέτα για ομάδα ή πελάτη) και ληξιπρόθεσμο.
export function BalanceCards({
  balance,
  overdue,
  isClient,
}: BalanceCardsProps) {
  return (
    <StatGrid
      items={[
        { label: balanceLabel(balance, isClient), value: balanceText(balance) },
        {
          label: OVERDUE_LABEL,
          value: formatMoney(overdue),
          hint: overdue > 0 ? OVERDUE_BADGE : undefined,
          tone: overdue > 0 ? "attention" : undefined,
        },
      ]}
    />
  );
}

export function PaymentCard({
  payment,
}: {
  payment: NonNullable<LedgerView["payment"]>;
}) {
  return (
    <Panel label={PAYMENT_TITLE}>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{PAYMENT_HOLDER}</dt>
        <dd className="m-0">{payment.holder}</dd>
        <dt className="text-muted-foreground">{PAYMENT_BANK}</dt>
        <dd className="m-0">{payment.bank}</dd>
        <dt className="text-muted-foreground">{PAYMENT_IBAN}</dt>
        <dd className="m-0 font-mono break-all">{payment.iban}</dd>
      </dl>
    </Panel>
  );
}

// «Προς τιμολόγηση»: μόνο για την ομάδα. Δεν είναι οφειλή.
export function ToInvoiceCard({
  toInvoice,
}: {
  toInvoice: NonNullable<LedgerView["toInvoice"]>;
}) {
  return (
    <Panel
      label={TO_INVOICE_TITLE}
      aside={
        <Link href="/app/finance/to-invoice" className="kit-label text-primary">
          {TO_INVOICE_LINK}
        </Link>
      }
    >
      <div className="grid gap-2">
        <span className="text-2xl font-medium tabular-nums">
          {formatMoney(toInvoice.amount)}
        </span>
        <span className="text-sm text-muted-foreground">
          {toInvoice.count}{" "}
          {toInvoice.count === 1
            ? "ανοιχτό Τιμολογητέο"
            : "ανοιχτά Τιμολογητέα"}{" "}
          (καθαρά ποσά).
        </span>
        <p className="m-0 text-sm text-muted-foreground">{TO_INVOICE_NOTE}</p>
      </div>
    </Panel>
  );
}
