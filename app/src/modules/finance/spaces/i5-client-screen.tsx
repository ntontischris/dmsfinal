import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeViewOf } from "../caps";
import { LEDGER_EMPTY_TEXT, LEDGER_NO_ACCESS_TEXT } from "../ledger-labels";
import { getLedger } from "../ledger-queries";
import type { LedgerView } from "../ledger-view-schema";
import { i5RowsOf, type I5Row } from "./i5-adapter";
import { MoneyHero, NoteBox, PaymentBox, initialsOf } from "./i5-cards";
import { LedgerLines } from "./i5-ledger";
import { balanceLabelOf, factsOf } from "./i5-model";

import "./i245.css";
import "./money-lines.css";
import "./i5-lines.css";

// I5 Καρτέλα του Χρήστη πελάτη (Χρήματα restyle): η δική του Καρτέλα, από την ίδια ανάγνωση (client_ledger_view χωρίς
// Πελάτη). Χωρίς επιλογή Πελάτη, Υπενθυμίσεις ή «Προς τιμολόγηση». Όταν χρωστά, το «Πώς πληρώνω» είναι ανοιχτό.

function ClientActions({ hasPayment, owes }: { hasPayment: boolean; owes: boolean }) {
  return (
    <>
      {hasPayment && (
        <a href="#pay" data-primary={owes ? "true" : undefined}>
          Πώς πληρώνω
        </a>
      )}
      <Link href={hrefOf("I2")}>Τιμολόγια</Link>
    </>
  );
}

function ClientLedger({ data, rows }: { data: LedgerView; rows: readonly I5Row[] }) {
  const owes = data.balance > 0;
  return (
    <div className="ml-stack">
      <MoneyHero
        mono={initialsOf(data.clientName)}
        title={data.clientName}
        label={balanceLabelOf(data.balance, true)}
        amount={Math.abs(data.balance)}
        isOpen={owes}
        facts={factsOf(rows, data.overdue)}
        hasWarning={data.overdue > 0}
        actions={<ClientActions hasPayment={data.payment !== null} owes={owes} />}
      />
      {data.payment && (
        <PaymentBox payment={data.payment} isClient isOpen={owes} />
      )}
      <NoteBox />
    </div>
  );
}

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
  return (
    <div data-spaces>
      <div className="ml-head i5-head">
        <p>Τι χρωστάς, πώς πληρώνεις και κάθε κίνηση του λογαριασμού σου.</p>
      </div>
      <ClientLedger data={data} rows={rows} />
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία κίνηση">
          {LEDGER_EMPTY_TEXT}
        </StateNotice>
      ) : (
        <LedgerLines rows={rows} />
      )}
    </div>
  );
}
