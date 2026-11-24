import Link from "next/link";
import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
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
import { TRAIL_EMPTY } from "../invoice-corrections-labels";
import { correctHref, trailText } from "../invoice-detail-helpers";
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

import "./money-lines.css";

// I8 Τιμολόγιο (d3): ένα Τιμολόγιο με τις πληρωμές του. Απαντά «πόσο μένει και τι κάνω;»: πάνω η κατάσταση, το υπόλοιπο
// και τα κουμπιά (Ήρθε πληρωμή, PDF, Διόρθωση)· από κάτω κλειστά κουτιά: Πληρωμές, Αφορά, Ίχνος.

export const TONES: Readonly<Record<string, BadgeTone>> = {
  paid: "strong",
  overdue: "attention",
  credit: "faded",
  unpaid: "waiting",
  partial: "waiting",
  voided: "faded",
};

export const statusText = (status: string): string =>
  status === "voided"
    ? "ακυρωμένο"
    : (STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status);

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

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const initialsOf = (number: string): string =>
  number.replace(/[^\p{L}\p{N}]/gu, "").slice(-4);

function Box(props: { title: string; hint: string; children: ReactNode }) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div>{props.children}</div>
      </details>
    </section>
  );
}

function Actions(props: {
  detail: InvoiceDetail;
  money: InvoicePayments;
  caps: FinanceCaps;
}) {
  const { detail, money, caps } = props;
  const canCollect =
    caps.canRegister && money.remaining > 0 && detail.voided === null;
  return (
    <div className="ml-quick">
      {canCollect && (
        <Link
          data-primary="true"
          href={hrefOf("I4", { client: detail.clientId, invoice: detail.id })}
        >
          Ήρθε πληρωμή
        </Link>
      )}
      <a href={pdfHref(detail.id)} target="_blank" rel="noreferrer">
        Λήψη PDF
      </a>
      {caps.canRegisterInvoices && detail.can.correct && (
        <Link href={correctHref(detail.id)}>Διόρθωση/ακύρωση</Link>
      )}
    </div>
  );
}

const subtitleOf = (detail: InvoiceDetail): string =>
  [
    detail.clientName,
    `έκδοση ${fmtDate(detail.issueDate)}`,
    detail.dueDate ? `λήξη ${fmtDate(detail.dueDate)}` : null,
    detail.creditForNumber ? `διορθώνει ${detail.creditForNumber}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

function Hero(props: {
  detail: InvoiceDetail;
  money: InvoicePayments;
  caps: FinanceCaps;
}) {
  const { detail, money } = props;
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(detail.number)}
      </span>
      <div>
        <Badge tone={TONES[money.status] ?? "faded"}>
          {statusText(money.status)}
        </Badge>
        <h1>
          {capitalize(KIND_LABELS[detail.kind])} {detail.number}
        </h1>
        <p>{subtitleOf(detail)}</p>
        <p className="ml-hero-amount" data-open={money.remaining > 0}>
          {fmtMoney(money.remaining)}
          <small>
            υπόλοιπο · σύνολο {fmtMoney(detail.total)} · μπήκαν{" "}
            {fmtMoney(money.paid)}
          </small>
        </p>
      </div>
      <Actions {...props} />
    </header>
  );
}

const paymentsHint = (money: InvoicePayments): string =>
  money.payments.length === 0
    ? "καμία ακόμα"
    : `${money.payments.length} · μπήκαν ${fmtMoney(money.paid)}`;

function Payments({ money }: { money: InvoicePayments }) {
  return (
    <Box title="Πληρωμές" hint={paymentsHint(money)}>
      {money.payments.length === 0 ? (
        <p className="muted">Καμία πληρωμή ακόμα.</p>
      ) : (
        <Rows
          items={money.payments.map((p) => ({
            id: p.receiptId,
            title: fmtMoney(p.applied),
            meta: paymentMeta(p),
          }))}
        />
      )}
    </Box>
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
  const hint = `Πελάτης · ${money.agreements.length} Συμφωνίες · ${money.productions.length} Παραγωγές`;
  return (
    <Box title="Αφορά" hint={hint}>
      <Rows items={items} />
    </Box>
  );
}

function Trail({ detail }: { detail: InvoiceDetail }) {
  const hint =
    detail.trail.length === 0 ? "τίποτα ακόμα" : `${detail.trail.length} αλλαγές`;
  return (
    <Box title="Ίχνος" hint={hint}>
      {detail.trail.length === 0 ? (
        <p className="muted">{TRAIL_EMPTY}</p>
      ) : (
        <Rows
          items={detail.trail.map((entry) => ({
            id: `${entry.at}-${entry.action}-${entry.reason ?? ""}`,
            title: trailText(entry),
            meta: `${fmtDate(athensToday(new Date(entry.at)))} · ${entry.byName ?? "—"}`,
          }))}
        />
      )}
    </Box>
  );
}

function InvoicePage(props: {
  detail: InvoiceDetail;
  money: InvoicePayments;
  caps: FinanceCaps;
}) {
  return (
    <div data-spaces className="ml-stack">
      <Hero {...props} />
      <Payments money={props.money} />
      <Related detail={props.detail} money={props.money} />
      <Trail detail={props.detail} />
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
