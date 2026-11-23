import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import type { InvoiceItem } from "../invoices-view-schema";
import { getLedger } from "../ledger-queries";
import type { LedgerView } from "../ledger-view-schema";
import { i5RowsOf, type I5Row } from "./i5-adapter";
import {
  MoneyHero,
  NoteBox,
  PaymentBox,
  ToInvoiceBox,
  initialsOf,
} from "./i5-cards";
import { LedgerLines } from "./i5-ledger";
import { balanceLabelOf, factsOf } from "./i5-model";

// Η Καρτέλα ενός Πελάτη για την ομάδα: κεφαλίδα με το υπόλοιπο και τα γρήγορα κουμπιά, κλειστά κουτιά, κινήσεις.

function TeamActions(props: { clientId: string; canRegister: boolean }) {
  return (
    <>
      {props.canRegister && (
        <Link
          data-primary="true"
          href={hrefOf("I4", { client: props.clientId, new: "1" })}
        >
          Ήρθε πληρωμή
        </Link>
      )}
      <Link href={hrefOf("I2", { client: props.clientId })}>Τιμολόγια</Link>
      <Link href={hrefOf("B2", { id: props.clientId })}>Σελίδα Πελάτη</Link>
    </>
  );
}

function TeamLedger(props: {
  data: LedgerView;
  rows: readonly I5Row[];
  canRegister: boolean;
}) {
  const { data, rows } = props;
  return (
    <div className="ml-stack">
      <MoneyHero
        mono={initialsOf(data.clientName)}
        title={data.clientName}
        label={balanceLabelOf(data.balance, false)}
        amount={Math.abs(data.balance)}
        isOpen={data.balance > 0}
        facts={factsOf(rows, data.overdue)}
        hasWarning={data.overdue > 0}
        actions={
          <TeamActions clientId={data.clientId} canRegister={props.canRegister} />
        }
      />
      {data.toInvoice && (
        <ToInvoiceBox
          amount={data.toInvoice.amount}
          count={data.toInvoice.count}
        />
      )}
      {data.payment && <PaymentBox payment={data.payment} />}
      <NoteBox />
    </div>
  );
}

export async function I5Body(props: {
  clientId: string;
  invoices: readonly InvoiceItem[] | null;
  canRegister: boolean;
}) {
  const ledger = await getLedger(props.clientId);
  if (!ledger.ok) return <ErrorNotice what="η Καρτέλα Πελάτη" />;
  const { data } = ledger;
  const rows = i5RowsOf(data.entries, props.clientId, props.invoices);
  return (
    <>
      <TeamLedger data={data} rows={rows} canRegister={props.canRegister} />
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία κίνηση">
          Δεν υπάρχουν Τιμολόγια ή Εισπράξεις για αυτόν τον Πελάτη.
        </StateNotice>
      ) : (
        <LedgerLines rows={rows} />
      )}
    </>
  );
}
