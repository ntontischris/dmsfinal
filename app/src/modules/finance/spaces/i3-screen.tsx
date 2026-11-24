import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import {
  getInvoiceContext,
  getInvoiceDetail,
  getInvoicePayments,
  getInvoiceReminders,
  getInvoices,
  getVoidedInvoices,
} from "../invoices-queries";
import { trailRowsOf, type TrailRow } from "../invoice-trail";
import { numberSuggestionsOf } from "../invoices-model";
import { athensToday } from "../money";
import { listClientOptions } from "../queries";
import type { InvoiceDetail } from "../invoice-detail-schema";
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

// Βήμα 1: ο Πελάτης στη διεύθυνση (?client=). Λίστα με αναζήτηση· ίδια ονόματα ξεχωρίζουν με αχνή λέξη (ΑΦΜ, πόλη, email).
function ClientStep({
  clients,
  clientId,
}: {
  clients: readonly ClientOption[];
  clientId: string | undefined;
}) {
  const name = clients.find((c) => c.id === clientId)?.name;
  const options = clients.map((c) => ({
    label: c.name,
    href: hrefOf("I3", { client: c.id }),
    isCurrent: c.id === clientId,
    hint: c.hint,
  }));
  return (
    <Step
      no={1}
      title="Πελάτης"
      hint={name ?? "Διάλεξε τον Πελάτη του Τιμολογίου για να συνεχίσεις."}
    >
      <FilterBar
        label="Πελάτης του Τιμολογίου"
        filters={[{ label: "Πελάτης", options, isSearchable: true }]}
      />
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
  // Ο προτεινόμενος αριθμός βγαίνει από τα Τιμολόγια της εταιρείας (πιο πρόσφατα πρώτα)· αν λείπουν, μένει κενός.
  // Οι αριθμοί των ακυρωμένων καταχωρίσεων δεν ξαναπροτείνονται.
  const [ctx, all, voided] = await Promise.all([
    getInvoiceContext(clientId),
    getInvoices("all"),
    getVoidedInvoices(),
  ]);
  const voidedNumbers = voided.ok ? voided.data.map((item) => item.number) : [];
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
      suggestions={all.ok ? numberSuggestionsOf(all.data.items, voidedNumbers) : {}}
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

// Το Ίχνος της Διόρθωσης με τις ίδιες γραμμές με τη σελίδα Τιμολογίου (I8): ενέργειες, πληρωμές, υπενθυμίσεις.
async function correctionTrailOf(id: string, trail: InvoiceDetail["trail"]): Promise<TrailRow[]> {
  const [money, reminders] = await Promise.all([
    getInvoicePayments(id, athensToday()),
    getInvoiceReminders(id),
  ]);
  return trailRowsOf(
    trail,
    money.ok ? money.data.payments : [],
    reminders.ok ? reminders.data : [],
  );
}

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
  if (detail?.ok)
    return wrap(
      <CorrectionPage
        detail={detail}
        trailRows={await correctionTrailOf(detail.data.id, detail.data.trail)}
      />,
    );
  const clients = await listClientOptions();
  if (!clients.ok)
    return wrap(<ErrorNotice what="την Καταχώρηση Τιμολογίου" />);
  const clientStep = (
    <ClientStep clients={clients.data} clientId={query.clientId} />
  );
  return wrap(
    <>
      {detail !== null && <CorrectionPage detail={detail} trailRows={[]} />}
      {query.clientId === undefined ? (
        <NoClient clientStep={clientStep} />
      ) : (
        <Workbench clientId={query.clientId} clientStep={clientStep} />
      )}
    </>,
  );
}
