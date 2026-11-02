import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeViewOf } from "../caps";
import {
  LEDGER_EMPTY_TEXT,
  LEDGER_NO_ACCESS_TEXT,
  LEDGER_NOTE,
} from "../ledger-labels";
import { getLedger } from "../ledger-queries";
import { i5RowsOf } from "./i5-adapter";
import { BalanceCards, PaymentCard } from "./i5-cards";
import { LedgerTable } from "./i5-ledger";

import "./i245.css";

// I5 Καρτέλα του Χρήστη πελάτη στη νέα εμφάνιση (prototype `screens/I5.tsx`, isClient): η δική του Καρτέλα, από την ίδια
// ανάγνωση με την παλιά (client_ledger_view χωρίς Πελάτη). Χωρίς επιλογή Πελάτη, Υπενθυμίσεις ή «Προς τιμολόγηση».
// Όταν χρωστά, το «Πώς πληρώνω» ανεβαίνει πάνω από τις κινήσεις, όπως στο prototype.
export async function SpacesClientLedger() {
  const viewer = await getViewer();
  if (financeViewOf(viewer) !== "client")
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {LEDGER_NO_ACCESS_TEXT}
        </StateNotice>
      </div>
    );
  const ledger = await getLedger();
  if (!ledger.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η Καρτέλα σου" />
      </div>
    );
  const { data } = ledger;
  const rows = i5RowsOf(data.entries, data.clientId, null);
  const owes = data.balance > 0;
  const payment = data.payment && <PaymentCard payment={data.payment} isClient />;
  return (
    <div data-spaces>
      <BalanceCards balance={data.balance} overdue={data.overdue} isClient />
      {owes && payment}
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία κίνηση">
          {LEDGER_EMPTY_TEXT}
        </StateNotice>
      ) : (
        <LedgerTable rows={rows} />
      )}
      <p className="note">{LEDGER_NOTE}</p>
      {!owes && payment && <div className="grid2">{payment}</div>}
    </div>
  );
}
