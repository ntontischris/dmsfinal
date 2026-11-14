import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel, StatGrid, type StatProps } from "@/spaces/kit/panel";
import { Rows } from "@/spaces/kit/rows";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtDate,
  fmtMoney,
  type BadgeTone,
} from "@/spaces/screens/shared";

import { financeCaps } from "../caps";
import { correctHref } from "../invoice-detail-helpers";
import type {
  InvoiceDetail,
  InvoicePayment,
  InvoicePayments,
} from "../invoice-detail-schema";
import { pdfHref } from "../invoices-helpers";
import { KIND_LABELS, STATUS_LABELS } from "../invoices-labels";
import { getInvoiceDetail, getInvoicePayments } from "../invoices-queries";
import { athensToday } from "../money";
import type { FinanceCaps } from "../types";
import { InvoiceTrail } from "./i3-trail";

import "./i13.css";

// I8 Τιμολόγιο (d3): ένα Τιμολόγιο με τις πληρωμές του. Απαντά «πόσο μένει και τι κάνω;»: κατάσταση, υπόλοιπο,
// Είσπραξη έτοιμη από εδώ, PDF, Ίχνος, και σύνδεσμοι σε Πελάτη, Συμφωνίες και Παραγωγές.

const TONES: Readonly<Record<string, BadgeTone>> = {
  paid: "strong",
  overdue: "attention",
  credit: "faded",
  unpaid: "waiting",
  partial: "waiting",
  voided: "faded",
};

const statusText = (status: string): string =>
  status === "voided"
    ? "ακυρωμένο"
    : (STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status);

const statsOf = (
  detail: InvoiceDetail,
  money: InvoicePayments,
): StatProps[] => [
  { label: "Σύνολο με ΦΠΑ", value: fmtMoney(detail.total) },
  { label: "Εξοφλήθηκε", value: fmtMoney(money.paid) },
  {
    label: "Υπόλοιπο",
    value: fmtMoney(money.remaining),
    tone: money.remaining > 0 ? "attention" : "ok",
  },
  {
    label: "Λήξη",
    value: detail.dueDate ? fmtDate(detail.dueDate) : "—",
  },
];

function Actions(props: {
  detail: InvoiceDetail;
  money: InvoicePayments;
  caps: FinanceCaps;
}) {
  const { detail, money, caps } = props;
  const canCollect =
    caps.canRegister && money.remaining > 0 && detail.voided === null;
  return (
    <div className="toolbar">
      {canCollect && (
        <Link
          className="button"
          data-primary="true"
          href={hrefOf("I4", { client: detail.clientId, invoice: detail.id })}
        >
          Καταχώρηση Είσπραξης
        </Link>
      )}
      <a
        className="button"
        href={pdfHref(detail.id)}
        target="_blank"
        rel="noreferrer"
      >
        Λήψη PDF
      </a>
      {caps.canRegisterInvoices && detail.can.correct && (
        <Link href={correctHref(detail.id)}>Διόρθωση/ακύρωση</Link>
      )}
    </div>
  );
}

const paymentMeta = (p: InvoicePayment): string =>
  [
    fmtDate(p.receivedOn),
    p.methodLabel,
    `Είσπραξη ${fmtMoney(p.receiptAmount)}`,
    p.withheld > 0
      ? `+ ${p.withholdingLabel ?? "παρακράτηση"} ${fmtMoney(p.withheld)}`
      : null,
    p.linked ? "συνδεδεμένη με αυτό" : "από το παλαιότερο",
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

function Payments({ payments }: { payments: readonly InvoicePayment[] }) {
  return (
    <Panel label="Πληρωμές">
      {payments.length === 0 ? (
        <p className="muted">Καμία πληρωμή ακόμα.</p>
      ) : (
        <Rows
          items={payments.map((p) => ({
            id: p.receiptId,
            title: fmtMoney(p.applied),
            meta: paymentMeta(p),
          }))}
        />
      )}
    </Panel>
  );
}

function Related({
  detail,
  money,
}: {
  detail: InvoiceDetail;
  money: InvoicePayments;
}) {
  const items = [
    {
      id: detail.clientId,
      title: detail.clientName,
      href: hrefOf("B2", { id: detail.clientId }),
      meta: "Πελάτης",
    },
    ...money.agreements.map((a) => ({
      id: a.id,
      title: a.title,
      href: hrefOf("D2", { id: a.id }),
      meta: "Συμφωνία",
    })),
    ...money.productions.map((p) => ({
      id: p.id,
      title: p.title,
      href: hrefOf("G2", { id: p.id }),
      meta: "Παραγωγή",
    })),
  ];
  return (
    <Panel label="Αφορά">
      <Rows items={items} />
    </Panel>
  );
}

function InvoicePage(props: {
  detail: InvoiceDetail;
  money: InvoicePayments;
  caps: FinanceCaps;
}) {
  const { detail, money } = props;
  return (
    <div data-spaces>
      <header className="page-head">
        <h1>
          {KIND_LABELS[detail.kind]} {detail.number}
          <span className="page-head-dot">.</span>
        </h1>
        <p className="muted">
          {detail.clientName} · έκδοση {fmtDate(detail.issueDate)}
          {detail.creditForNumber &&
            ` · διορθώνει ${detail.creditForNumber}`}{" "}
          <Badge tone={TONES[money.status] ?? "faded"}>
            {statusText(money.status)}
          </Badge>
        </p>
      </header>
      <StatGrid items={statsOf(detail, money)} />
      <Actions {...props} />
      <Payments payments={money.payments} />
      <Related detail={detail} money={money} />
      <InvoiceTrail number={detail.number} trail={detail.trail} />
    </div>
  );
}

export async function SpacesInvoice({ id }: { id: string }) {
  const caps = financeCaps(await getViewer());
  if (!caps.canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά» για όλους.
        </StateNotice>
      </div>
    );
  const [detail, money] = await Promise.all([
    getInvoiceDetail(id),
    getInvoicePayments(id, athensToday()),
  ]);
  if (!detail.ok || !money.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Τιμολόγιο" />
      </div>
    );
  return <InvoicePage detail={detail.data} money={money.data} caps={caps} />;
}
