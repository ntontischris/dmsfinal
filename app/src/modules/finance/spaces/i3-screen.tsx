import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import type { InvoiceDetail } from "../invoice-detail-schema";
import { getInvoiceContext, getInvoiceDetail } from "../invoices-queries";
import { athensToday } from "../money";
import { listClientOptions } from "../queries";
import type { ReadResult } from "../read";
import type { ClientOption } from "../types";
import { I3Correct } from "./i3-correct";
import { InvoiceTrail } from "./i3-trail";
import { I3Workbench } from "./i3-workbench";

import "./i13.css";

export interface SpacesNewInvoiceQuery {
  // Ήδη ελεγμένα ως uuid από τη σελίδα.
  clientId?: string;
  invoiceId?: string;
}

function ClientPicker({ clients, clientId }: { clients: readonly ClientOption[]; clientId: string | undefined }) {
  return (
    <form method="get" action={hrefOf("I3")} className="toolbar">
      <label>
        Πελάτης{" "}
        <select className="select" name="client" defaultValue={clientId ?? ""}>
          {clientId === undefined && <option value="">Διάλεξε…</option>}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="button">
        Αλλαγή
      </button>
    </form>
  );
}

async function Workbench({ clientId }: { clientId: string }) {
  const ctx = await getInvoiceContext(clientId);
  if (!ctx.ok) return <ErrorNotice what="τα στοιχεία του Πελάτη" />;
  return <I3Workbench key={clientId} clientId={clientId} ctx={ctx.data} today={athensToday()} />;
}

const wrap = (body: ReactNode) => <div data-spaces>{body}</div>;

// Διόρθωση (?invoice=): το Ίχνος και η Διόρθωση/Ακύρωση της καταχώρισης, όπως στο prototype κάτω από τον πάγκο.
function CorrectionPart({ detail }: { detail: ReadResult<InvoiceDetail> }) {
  if (!detail.ok) return <ErrorNotice what="η καταχώριση" />;
  const invoice = detail.data;
  return (
    <>
      <InvoiceTrail number={invoice.number} trail={invoice.trail} />
      {invoice.voided !== null && (
        <StateNotice kind="empty" title="Η καταχώριση είναι ακυρωμένη">
          Λόγος: {invoice.voided.reason}
        </StateNotice>
      )}
      {invoice.voided === null && invoice.can.correct && <I3Correct key={invoice.id} invoice={invoice} />}
    </>
  );
}

// I3 Καταχώρηση Τιμολογίου στη νέα εμφάνιση (prototype `screens/I3.tsx`): Πελάτης, πάγκος καταχώρησης με κάλυψη των
// Τιμολογητέων, και με ?invoice= το Ίχνος και η Διόρθωση/Ακύρωση. Όλα πάνω στις πραγματικές ενέργειες.
export async function SpacesNewInvoice({ query }: { query: SpacesNewInvoiceQuery }) {
  const caps = financeCaps(await getViewer());
  if (!caps.canView || !caps.canRegisterInvoices)
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Μόνο όποιος καταχωρεί Τιμολόγια.
      </StateNotice>,
    );
  const clients = await listClientOptions();
  if (!clients.ok) return wrap(<ErrorNotice what="την Καταχώρηση Τιμολογίου" />);
  const detail = query.invoiceId ? await getInvoiceDetail(query.invoiceId) : null;
  const clientId = (detail?.ok ? detail.data.clientId : undefined) ?? query.clientId;
  return wrap(
    <>
      <ClientPicker clients={clients.data} clientId={clientId} />
      {clientId === undefined ? (
        <p className="muted">Διάλεξε τον Πελάτη του Τιμολογίου για να συνεχίσεις.</p>
      ) : (
        <Workbench clientId={clientId} />
      )}
      {detail !== null && <CorrectionPart detail={detail} />}
    </>,
  );
}
