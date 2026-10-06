import { financeCapsOf } from "@/data/finance-access";
import { SALES_CLIENTS } from "@/data/sales";
import { I3Correct } from "@/screens/i3-correct";
import { contextOf, correctionOf, invoiceById } from "@/screens/i3-context";
import { InvoiceTrail } from "@/screens/i3-trail";
import { I3Workbench } from "@/screens/i3-workbench";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./i13.css";

const DEFAULT_CLIENT = "kypseli";

function ClientPicker(props: { clientId: string; state: string | undefined }) {
  return (
    <form method="get" className="toolbar">
      <label>
        Πελάτης{" "}
        <select className="select" name="client" defaultValue={props.clientId}>
          {SALES_CLIENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {props.state && <input type="hidden" name="state" value={props.state} />}
      <button type="submit" className="button">
        Αλλαγή
      </button>
    </form>
  );
}

export function I3({ role, query }: ScreenProps) {
  const caps = financeCapsOf(role);
  const state = parseState(query.state);
  const invoice = invoiceById(query.invoice);
  const clientId = invoice?.clientId ?? query.client ?? DEFAULT_CLIENT;
  const header = (
    <StateSwitcher
      role={role}
      code="I3"
      state={state}
      keep={{ client: query.client, invoice: query.invoice }}
    />
  );
  if (!caps.canRegisterInvoices) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Μόνο όποιος καταχωρεί Τιμολόγια.
        </StateNotice>
      </>
    );
  }
  const ctx = contextOf(clientId);
  if (state === "error" || !ctx) {
    return (
      <>
        {header}
        <ErrorNotice what="την Καταχώρηση Τιμολογίου" />
      </>
    );
  }
  return (
    <>
      {header}
      <ClientPicker clientId={clientId} state={query.state} />
      {state === "empty" ? (
        <StateNotice kind="empty" title="Δεν υπάρχει Τιμολόγιο προς καταχώρηση">
          Ανέβασε το PDF του Τιμολογίου όταν εκδοθεί.
        </StateNotice>
      ) : (
        <I3Workbench key={clientId} ctx={ctx} />
      )}
      {invoice && (
        <>
          <InvoiceTrail invoice={invoice} />
          {!invoice.voided && (
            <I3Correct key={invoice.id} invoice={correctionOf(invoice)} />
          )}
        </>
      )}
    </>
  );
}
