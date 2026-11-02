import Link from "next/link";
import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import { getInvoices } from "../invoices-queries";
import { LEDGER_NO_ACCESS_TEXT } from "../ledger-labels";
import { getLedger, listLedgerClients } from "../ledger-queries";
import type { InvoiceItem } from "../invoices-view-schema";
import type { LedgerClient } from "../ledger-view-schema";
import { i5ClientIdOf, i5RowsOf } from "./i5-adapter";
import { BalanceCards, PaymentCard, ToInvoiceCard } from "./i5-cards";
import { LedgerTable } from "./i5-ledger";

import "./i245.css";

const Spaces = ({ children }: { children: ReactNode }) => (
  <div data-spaces>{children}</div>
);

function ClientPicker(props: {
  clients: readonly LedgerClient[];
  current: string;
}) {
  return (
    <nav className="tabs" aria-label="Πελάτης">
      {props.clients.map((c) => (
        <Link
          key={c.id}
          className="tab"
          aria-current={c.id === props.current ? "page" : undefined}
          href={hrefOf("I5", { client: c.id })}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

async function I5Body(props: {
  clientId: string;
  invoices: readonly InvoiceItem[] | null;
}) {
  const ledger = await getLedger(props.clientId);
  if (!ledger.ok) return <ErrorNotice what="η Καρτέλα Πελάτη" />;
  const { data } = ledger;
  const rows = i5RowsOf(data.entries, props.clientId, props.invoices);
  return (
    <>
      <BalanceCards balance={data.balance} overdue={data.overdue} />
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία κίνηση">
          Δεν υπάρχουν Τιμολόγια ή Εισπράξεις για αυτόν τον Πελάτη.
        </StateNotice>
      ) : (
        <LedgerTable rows={rows} />
      )}
      <p className="note">
        Μόνο το Τιμολόγιο δημιουργεί οφειλή. Αρνητικό υπόλοιπο σημαίνει υπόλοιπο
        υπέρ του πελάτη (π.χ. προκαταβολή), που συμψηφίζεται με το επόμενο
        Τιμολόγιο.
      </p>
      <div className="grid2">
        {data.payment && <PaymentCard payment={data.payment} />}
        {data.toInvoice && (
          <ToInvoiceCard
            amount={data.toInvoice.amount}
            count={data.toInvoice.count}
          />
        )}
      </div>
    </>
  );
}

// I5 Καρτέλα Πελάτη στη νέα εμφάνιση (prototype `screens/I5.tsx`), μόνο για την ομάδα (Οικονομικά + ποσά για όλους):
// ο Χρήστης πελάτη μένει στην παλιά εμφάνιση. Πελάτες = όσοι έχουν κινήσεις (clients_with_finance)· ο ?client= διαλέγει,
// αλλιώς ο πρώτος. Η κατάσταση κάθε Τιμολογίου έρχεται από το invoices_view· αν δεν φορτώσει, η Καρτέλα φαίνεται χωρίς αυτήν.
export async function SpacesLedger({ clientId }: { clientId?: string }) {
  const caps = financeCaps(await getViewer());
  if (!caps.canView)
    return (
      <Spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {LEDGER_NO_ACCESS_TEXT}
        </StateNotice>
      </Spaces>
    );
  const [clients, invoices] = await Promise.all([
    listLedgerClients(),
    getInvoices("all"),
  ]);
  if (!clients.ok)
    return (
      <Spaces>
        <ErrorNotice what="η Καρτέλα Πελάτη" />
      </Spaces>
    );
  const current = i5ClientIdOf(clientId, clients.data);
  if (current === undefined)
    return (
      <Spaces>
        <StateNotice kind="empty" title="Καμία κίνηση σε κανέναν Πελάτη">
          Οι Πελάτες εμφανίζονται εδώ μόλις αποκτήσουν Τιμολόγιο ή Είσπραξη.
        </StateNotice>
      </Spaces>
    );
  return (
    <Spaces>
      <ClientPicker clients={clients.data} current={current} />
      <I5Body
        clientId={current}
        invoices={invoices.ok ? invoices.data.items : null}
      />
    </Spaces>
  );
}
