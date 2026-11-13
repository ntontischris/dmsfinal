import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import { getInvoices } from "../invoices-queries";
import { RECEIPT_NO_ACCESS } from "../labels";
import { athensToday } from "../money";
import {
  listClientOptions,
  listPaymentMethods,
  listReceipts,
  listWithholdingRates,
} from "../queries";
import type { ReadResult } from "../read";
import type { ClientOption, PaymentMethod, WithholdingRate } from "../types";
import { hasActionsColumn, i4RowsOf } from "./i4-adapter";
import { ReceiptsCsv } from "./i4-csv";
import { I4Form } from "./i4-form";
import { I4List } from "./i4-list";
import {
  openInvoicesByClient,
  receiptTargets,
  type OpenInvoice,
} from "./i4-model";

import "./i245.css";

const Spaces = ({ children }: { children: ReactNode }) => (
  <div data-spaces>{children}</div>
);

const activeMethodsOf = (methods: readonly PaymentMethod[]) =>
  methods
    .filter((method) => !method.retired)
    .map((method) => ({ id: method.id, name: method.label }));

export interface ReceiptsQuery {
  clientId?: string;
  invoiceId?: string;
}

function FormSlot(props: {
  clients: ReadResult<ClientOption[]> | null;
  methods: readonly PaymentMethod[];
  rates: ReadResult<WithholdingRate[]>;
  openByClient: Readonly<Record<string, readonly OpenInvoice[]>> | null;
  query: ReceiptsQuery;
}) {
  if (props.clients === null) return null;
  if (!props.clients.ok)
    return <ErrorNotice what="οι Πελάτες της καταχώρησης Είσπραξης" />;
  return (
    <I4Form
      clients={props.clients.data}
      methods={activeMethodsOf(props.methods)}
      openByClient={props.openByClient}
      rates={props.rates.ok ? props.rates.data.filter((r) => !r.retired) : []}
      today={athensToday()}
      initial={props.query}
    />
  );
}

// I4 Εισπράξεις στη νέα εμφάνιση (prototype `screens/I4.tsx`): η λίστα θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»
// (όλα)· η καταχώρηση και η διόρθωση «Καταχωρεί Εισπράξεις». Η βάση ελέγχει κάθε RPC. Το «Θα εξοφλήσει» και το «Για
// Τιμολόγιο» βγαίνουν από τα Τιμολόγια (invoices_view), με την κατανομή της βάσης.
// Με ?client=&invoice= (από γραμμή Τιμολογίου) η φόρμα ανοίγει έτοιμη για εκείνο το Τιμολόγιο (d4).
export async function SpacesReceipts({ query = {} }: { query?: ReceiptsQuery }) {
  const caps = financeCaps(await getViewer());
  if (!caps.canView)
    return (
      <Spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {RECEIPT_NO_ACCESS}
        </StateNotice>
      </Spaces>
    );
  const [receipts, methods, clients, invoices, rates] = await Promise.all([
    listReceipts(),
    listPaymentMethods(),
    caps.canRegister ? listClientOptions() : null,
    getInvoices("all"),
    listWithholdingRates(),
  ]);
  if (!receipts.ok || !methods.ok)
    return (
      <Spaces>
        <ErrorNotice what="οι Εισπράξεις" />
      </Spaces>
    );
  const items = invoices.ok ? invoices.data.items : null;
  const rows = i4RowsOf(
    receipts.data,
    items === null ? null : receiptTargets(receipts.data, items),
  );
  return (
    <Spaces>
      <div className="toolbar">
        <ReceiptsCsv rows={receipts.data} />
      </div>
      {!invoices.ok && (
        <ErrorNotice what="τα Τιμολόγια (για το «Θα εξοφλήσει» και το «Για Τιμολόγιο»)" />
      )}
      <FormSlot
        clients={clients}
        methods={methods.data}
        rates={rates}
        openByClient={items === null ? null : openInvoicesByClient(items)}
        query={query}
      />
      <p className="note">
        Οι τρόποι είσπραξης και τα ποσοστά παρακράτησης αλλάζουν στις Ρυθμίσεις › Οικονομικά. Η διόρθωση και
        η διαγραφή θέλουν λόγο και γράφονται στο ίχνος.
      </p>
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία Είσπραξη">
          Δεν έχει καταχωρηθεί Είσπραξη ακόμη.
        </StateNotice>
      ) : (
        <I4List
          rows={rows}
          methods={methods.data}
          hasActions={hasActionsColumn(rows)}
          today={athensToday()}
        />
      )}
    </Spaces>
  );
}
