import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import { getInvoiceContext, getInvoiceDetail } from "../invoices-queries";
import { athensToday } from "../money";
import { listClientOptions } from "../queries";
import type { ClientOption } from "../types";
import { CorrectionPage } from "./i3-correction";
import { I3Hero, Step } from "./i3-parts";
import { I3Workbench } from "./i3-workbench";

import "./i13.css";
import "./money-lines.css";
import "./i3-lines.css";

export interface SpacesNewInvoiceQuery {
  // Ήδη ελεγμένα ως uuid από τη σελίδα.
  clientId?: string;
  invoiceId?: string;
}

// Βήμα 1: ο Πελάτης στη διεύθυνση (?client=), με φόρμα GET.
function ClientStep({
  clients,
  clientId,
}: {
  clients: readonly ClientOption[];
  clientId: string | undefined;
}) {
  const name = clients.find((c) => c.id === clientId)?.name;
  return (
    <Step
      no={1}
      title="Πελάτης"
      hint={name ?? "Διάλεξε τον Πελάτη του Τιμολογίου για να συνεχίσεις."}
    >
      <form method="get" action={hrefOf("I3")} className="toolbar">
        <label>
          Πελάτης{" "}
          <select
            className="select"
            name="client"
            defaultValue={clientId ?? ""}
          >
            {clientId === undefined && <option value="">Διάλεξε…</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button">
          {clientId === undefined ? "Συνέχεια" : "Αλλαγή"}
        </button>
      </form>
    </Step>
  );
}

async function Workbench({
  clientId,
  clientStep,
}: {
  clientId: string;
  clientStep: ReactNode;
}) {
  const ctx = await getInvoiceContext(clientId);
  if (!ctx.ok)
    return (
      <div className="ml-stack">
        {clientStep}
        <ErrorNotice what="τα στοιχεία του Πελάτη" />
      </div>
    );
  return (
    <I3Workbench
      key={clientId}
      clientId={clientId}
      ctx={ctx.data}
      today={athensToday()}
      clientStep={clientStep}
    />
  );
}

// Χωρίς Πελάτη: hero χωρίς ποσό και μόνο το βήμα 1.
function NoClient({ clientStep }: { clientStep: ReactNode }) {
  return (
    <div className="ml-stack">
      <I3Hero
        tag="Νέο τιμολόγιο"
        title="Νέο τιμολόγιο"
        facts={[]}
        lead="Ανεβάζεις το PDF που εξέδωσες, γράφεις τα στοιχεία του και το καταχωρείς. Πρώτα ο Πελάτης."
      />
      {clientStep}
    </div>
  );
}

const wrap = (body: ReactNode) => <div data-spaces>{body}</div>;

// I3 Καταχώρηση Τιμολογίου: hero με το σύνολο και τα βήματα Πελάτης → PDF → Στοιχεία → Έλεγχος και καταχώρηση.
// Με ?invoice= η σελίδα της διόρθωσης: Διόρθωση, Ακύρωση, Ίχνος. Όλα πάνω στις πραγματικές ενέργειες.
export async function SpacesNewInvoice({
  query,
}: {
  query: SpacesNewInvoiceQuery;
}) {
  const caps = financeCaps(await getViewer());
  if (!caps.canView || !caps.canRegisterInvoices)
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Μόνο όποιος καταχωρεί Τιμολόγια.
      </StateNotice>,
    );
  const detail = query.invoiceId
    ? await getInvoiceDetail(query.invoiceId)
    : null;
  if (detail?.ok) return wrap(<CorrectionPage detail={detail} />);
  const clients = await listClientOptions();
  if (!clients.ok)
    return wrap(<ErrorNotice what="την Καταχώρηση Τιμολογίου" />);
  const clientStep = (
    <ClientStep clients={clients.data} clientId={query.clientId} />
  );
  return wrap(
    <>
      {detail !== null && <CorrectionPage detail={detail} />}
      {query.clientId === undefined ? (
        <NoClient clientStep={clientStep} />
      ) : (
        <Workbench clientId={query.clientId} clientStep={clientStep} />
      )}
    </>,
  );
}
