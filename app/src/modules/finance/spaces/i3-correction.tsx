
import { ErrorNotice, StateNotice, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { InvoiceDetail } from "../invoice-detail-schema";
import { KIND_LABELS } from "../invoices-labels";
import type { ReadResult } from "../read";
import { I3Correct } from "./i3-correct";
import { I3Hero, capitalize } from "./i3-parts";
import { InvoiceTrail } from "./i3-trail";

const LEAD =
  "Διορθώνεις στοιχεία που γράφτηκαν λάθος ή ακυρώνεις την καταχώριση. Λάθος μέσα στο ίδιο το τιμολόγιο διορθώνεται με πιστωτικό, όχι με ακύρωση.";

function CorrectionHero({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <I3Hero
      tag={invoice.voided === null ? "Διόρθωση" : "Ακυρωμένη"}
      title={`${capitalize(KIND_LABELS[invoice.kind])} ${invoice.number}`}
      client={invoice.clientName}
      facts={[
        invoice.clientName,
        `έκδοση ${fmtDate(invoice.issueDate)}`,
        invoice.dueDate ? `λήξη ${fmtDate(invoice.dueDate)}` : null,
        invoice.creditForNumber ? `διορθώνει ${invoice.creditForNumber}` : null,
      ]}
      amount={
        <p className="ml-hero-amount">
          {fmtMoney(invoice.total)}
          <small>
            σύνολο · καθαρό {fmtMoney(invoice.net)} · ΦΠΑ {fmtMoney(invoice.vat)}
          </small>
        </p>
      }
      lead={LEAD}
    />
  );
}

// Διόρθωση (?invoice=): hero με την καταχώριση, μετά η διόρθωση (βήμα), η ακύρωση και το Ίχνος (κλειστά κουτιά).
export function CorrectionPage({ detail }: { detail: ReadResult<InvoiceDetail> }) {
  if (!detail.ok) return <ErrorNotice what="η καταχώριση" />;
  const invoice = detail.data;
  return (
    <div className="ml-stack">
      <CorrectionHero invoice={invoice} />
      {invoice.voided !== null && (
        <StateNotice kind="empty" title="Η καταχώριση είναι ακυρωμένη">
          Λόγος: {invoice.voided.reason}
        </StateNotice>
      )}
      {invoice.voided === null && invoice.can.correct && <I3Correct key={invoice.id} invoice={invoice} />}
      <InvoiceTrail trail={invoice.trail} />
    </div>
  );
}
