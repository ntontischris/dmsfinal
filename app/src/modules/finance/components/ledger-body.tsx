import { Notice } from "@/components/ui/notice";

import {
  LEDGER_EMPTY_TEXT,
  LEDGER_EMPTY_TITLE,
  LEDGER_NOTE,
} from "../ledger-labels";
import type { LedgerView } from "../ledger-view-schema";

import { BalanceCards, PaymentCard, ToInvoiceCard } from "./ledger-cards";
import { LedgerTable } from "./ledger-table";

interface LedgerBodyProps {
  ledger: LedgerView;
  isClient: boolean;
}

// Η Καρτέλα ενός Πελάτη: κάρτες υπολοίπου, κινήσεις, σημείωση, στοιχεία πληρωμής και (μόνο για την ομάδα) «Προς τιμολόγηση».
export function LedgerBody({ ledger, isClient }: LedgerBodyProps) {
  return (
    <div className="grid gap-4">
      <h2 className="m-0 text-lg font-medium">{ledger.clientName}</h2>
      <BalanceCards
        balance={ledger.balance}
        overdue={ledger.overdue}
        isClient={isClient}
      />
      {ledger.entries.length === 0 ? (
        <Notice kind="empty" title={LEDGER_EMPTY_TITLE}>
          <p className="m-0">{LEDGER_EMPTY_TEXT}</p>
        </Notice>
      ) : (
        <LedgerTable entries={ledger.entries} />
      )}
      <p className="m-0 text-sm text-muted-foreground">{LEDGER_NOTE}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {ledger.payment && <PaymentCard payment={ledger.payment} />}
        {!isClient && ledger.toInvoice && (
          <ToInvoiceCard toInvoice={ledger.toInvoice} />
        )}
      </div>
    </div>
  );
}
