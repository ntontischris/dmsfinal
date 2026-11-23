import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import { getInvoices } from "../invoices-queries";
import { LEDGER_NO_ACCESS_TEXT } from "../ledger-labels";
import { listLedgerClients } from "../ledger-queries";
import type { LedgerClient } from "../ledger-view-schema";
import { balanceHintOf, i5ClientIdOf } from "./i5-adapter";
import { I5Body } from "./i5-body";

import "./i245.css";
import "./money-lines.css";
import "./i5-lines.css";

const Spaces = ({ children }: { children: ReactNode }) => (
  <div data-spaces>{children}</div>
);

// Η Καρτέλα ανήκει σε έναν Πελάτη: μία κάρτα «Πελάτης» με αναζήτηση, αντί για μία καρτέλα ανά Πελάτη. Δίπλα σε κάθε
// Πελάτη το υπόλοιπό του, ώστε η λίστα να δείχνει με μια ματιά ποιος χρωστά.
function ClientPicker(props: {
  clients: readonly LedgerClient[];
  current: string;
}) {
  return (
    <FilterBar
      label="Καρτέλα Πελάτη"
      filters={[
        {
          label: "Πελάτης",
          isSearchable: true,
          options: props.clients.map((c) => ({
            label: c.name,
            href: hrefOf("I5", { client: c.id }),
            isCurrent: c.id === props.current,
            hint: balanceHintOf(c.balance),
          })),
        },
      ]}
    />
  );
}

// I5 Καρτέλα Πελάτη στη νέα εμφάνιση (Χρήματα restyle: διάλεξε Πελάτη → κεφαλίδα → κουτιά → κινήσεις), μόνο για την ομάδα (Οικονομικά + ποσά για όλους):
// ο Χρήστης πελάτη έχει τη δική του (SpacesClientLedger). Πελάτες = όσοι έχουν κινήσεις (clients_with_finance)· ο ?client= διαλέγει,
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
      <div className="ml-head i5-head">
        <p>Διάλεξε Πελάτη: τι χρωστά, τι μπήκε και κάθε κίνηση του λογαριασμού του.</p>
      </div>
      <ClientPicker clients={clients.data} current={current} />
      <I5Body
        clientId={current}
        invoices={invoices.ok ? invoices.data.items : null}
        canRegister={caps.canRegister}
      />
    </Spaces>
  );
}
