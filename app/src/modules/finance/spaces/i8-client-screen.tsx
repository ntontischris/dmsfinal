import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtDate,
  fmtMoney,
} from "@/spaces/screens/shared";

import { financeViewOf } from "../caps";
import { pdfHref } from "../invoices-helpers";
import { KIND_LABELS } from "../invoices-labels";
import {
  CLIENT_FINANCE_NO_ACCESS_TEXT,
  CLIENT_INVOICE_NOT_FOUND_TEXT,
} from "../ledger-labels";
import { getClientInvoices, getPaymentInfo } from "../ledger-queries";
import type { ClientInvoice, PaymentInfo } from "../ledger-view-schema";
import { ClientPayBox } from "./client-pay-box";
import { needsPayment, ownInvoiceOf } from "./i8-client-model";
import { TONES, statusText } from "./i8-screen";

import "./i245.css";
import "./money-lines.css";
import "./i5-lines.css";

// I8 του Χρήστη πελάτη (Τ2): ένα δικό του Τιμολόγιο, από την ίδια ανάγνωση με τη λίστα του (client_invoices_view).
// Πάνω η κατάσταση, το υπόλοιπο, «Πώς πληρώνω» και PDF· από κάτω το «Πώς πληρώνω» με αιτιολογία τον αριθμό του.
// Ποτέ σημειώσεις, Ίχνος, Διόρθωση, πληρωμές ή άλλους Πελάτες. Τιμολόγιο άλλου Πελάτη = «δεν βρέθηκε».

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const subtitleOf = (invoice: ClientInvoice): string =>
  [
    `έκδοση ${fmtDate(invoice.issueDate)}`,
    invoice.dueDate ? `λήξη ${fmtDate(invoice.dueDate)}` : null,
    invoice.creditForNumber ? `διορθώνει ${invoice.creditForNumber}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

function Hero({ invoice }: { invoice: ClientInvoice }) {
  const owes = needsPayment(invoice);
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        €
      </span>
      <div>
        <Badge tone={TONES[invoice.status] ?? "faded"}>
          {statusText(invoice.status)}
        </Badge>
        <h1>
          {capitalize(KIND_LABELS[invoice.kind])} {invoice.number}
        </h1>
        <p>{subtitleOf(invoice)}</p>
        <p className="ml-hero-amount" data-open={owes}>
          {fmtMoney(owes ? invoice.remaining : invoice.total)}
          <small>
            {owes ? "μένει να πληρώσεις" : "σύνολο με ΦΠΑ"} · σύνολο{" "}
            {fmtMoney(invoice.total)} · πλήρωσες {fmtMoney(invoice.paid)}
          </small>
        </p>
      </div>
      <div className="ml-quick">
        {owes && (
          <a href="#pay" data-primary="true">
            Πώς πληρώνω
          </a>
        )}
        <a href={pdfHref(invoice.id)} target="_blank" rel="noreferrer">
          Λήψη PDF
        </a>
        <Link href={hrefOf("I2")}>Όλα τα Τιμολόγια</Link>
      </div>
    </header>
  );
}

function ClientInvoicePage(props: {
  invoice: ClientInvoice;
  info: PaymentInfo | null;
}) {
  const { invoice, info } = props;
  return (
    <div data-spaces className="ml-stack">
      <Hero invoice={invoice} />
      {invoice.kind !== "credit" && (
        <ClientPayBox
          info={info}
          reference={invoice.number}
          isOpen={needsPayment(invoice)}
        />
      )}
    </div>
  );
}

const notice = (kind: "denied" | "empty", title: string, text: string) => (
  <div data-spaces>
    <StateNotice kind={kind} title={title}>
      {text}
    </StateNotice>
  </div>
);

export async function SpacesClientInvoice({ id }: { id: string }) {
  if (financeViewOf(await getViewer()) !== "client")
    return notice("denied", "Χωρίς πρόσβαση", CLIENT_FINANCE_NO_ACCESS_TEXT);
  const [invoices, info] = await Promise.all([
    getClientInvoices(),
    getPaymentInfo(),
  ]);
  if (!invoices.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Τιμολόγιο" />
      </div>
    );
  const invoice = ownInvoiceOf(invoices.data.items, id);
  if (!invoice)
    return notice("empty", "Δεν βρέθηκε", CLIENT_INVOICE_NOT_FOUND_TEXT);
  return (
    <ClientInvoicePage invoice={invoice} info={info.ok ? info.data : null} />
  );
}
