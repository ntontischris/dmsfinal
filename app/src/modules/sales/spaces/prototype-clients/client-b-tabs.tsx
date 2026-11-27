// PROTOTYPE — throwaway. B: οι τέσσερις καρτέλες δεξιά (Συνεργασία, Επικοινωνία, Χρήματα, Στοιχεία)
// χωρίς περιττό εξωτερικό <Box isOpen>: κάθε καρτέλα είναι ο χώρος εργασίας της.
import Link from "next/link";
import { Suspense } from "react";

import { SpacesClientUsers } from "@/modules/access";
import { toAgreementRowView, type AgreementRow } from "@/modules/agreements";
import { deliverablesCaps, listDeliverableQueue } from "@/modules/deliverables";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import { SpacesClientSends, sendsCaps } from "@/modules/notifications";
import {
  STATE_LABELS as PRODUCTION_STATE_LABELS,
  listProductions,
  periodLabel,
} from "@/modules/productions";
import { hrefOf } from "@/spaces/data/screens";
import { Meter } from "@/spaces/kit/parts";
import {
  Badge,
  ErrorNotice,
  fmtDate,
  fmtMoney,
} from "@/spaces/screens/shared";

import { monthGlance } from "../b1-month";
import { ActivityLog } from "../b2-activity-log";
import { agreementTone, priceText } from "../b2-adapter";
import { BoxLinks, initialsOf, Line, Lines, Sub } from "../b2-box";
import { OverdueInvoices } from "../b2-boxes";
import type { ClientPageCtx } from "../b2-context";
import { Details } from "../b2-overview";
import { OpportunityLines } from "../b2-sections";
import { isSoloSales } from "./client-b-card";

type Production = Extract<
  Awaited<ReturnType<typeof listProductions>>,
  { ok: true }
>["data"][number];

const monthOf = (iso: string): string => iso.slice(0, 7);

const nextMonthOf = (today: string): string => {
  const [year, month] = today.split("-").map(Number);
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
};

// Ο τρέχων και ο επόμενος μήνας (και οι ανοιχτές Εφάπαξ) πάνω· τα υπόλοιπα, νεότερα πρώτα, πίσω από «Όλες».
const isNear = (p: Production, today: string): boolean =>
  p.period === null
    ? p.state === "open"
    : [monthOf(today), nextMonthOf(today)].includes(monthOf(p.period.starts));

const byPeriodDesc = (a: Production, b: Production): number =>
  (b.period?.starts ?? "9999").localeCompare(a.period?.starts ?? "9999");

function ProductionRows({ rows }: { rows: readonly Production[] }) {
  return (
    <Lines label="Παραγωγές">
      {rows.map((p) => (
        <Line
          key={p.id}
          mark={initialsOf(p.title)}
          isFaded={p.state !== "open"}
          tag={
            <Badge tone={p.state === "open" ? "strong" : undefined}>
              {PRODUCTION_STATE_LABELS[p.state]}
            </Badge>
          }
          title={p.title}
          href={hrefOf("G2", { id: p.id })}
          sub={p.period ? `Περίοδος ${periodLabel(p.period.starts)}` : "Εφάπαξ"}
        />
      ))}
    </Lines>
  );
}

async function SortedProductions({ ctx }: { ctx: ClientPageCtx }) {
  const result = await listProductions({ state: null, internalOnly: false });
  if (!result.ok) return <ErrorNotice what="οι Παραγωγές του Πελάτη" />;
  const all = result.data
    .filter((p) => p.client?.id === ctx.client.id)
    .sort(byPeriodDesc);
  const near = all.filter((p) => isNear(p, ctx.today));
  const rest = all.filter((p) => !isNear(p, ctx.today));
  return (
    <>
      {all.length === 0 && <p className="muted">Καμία Παραγωγή ακόμα.</p>}
      {near.length > 0 && <ProductionRows rows={near} />}
      {rest.length > 0 && (
        <details className="pc-more-rows">
          <summary>Όλες οι Παραγωγές ({all.length})</summary>
          <ProductionRows rows={rest} />
        </details>
      )}
      <BoxLinks>
        <Link href={hrefOf("G1", { client: ctx.client.id })}>
          Άνοιγμα στη λίστα Παραγωγών
        </Link>
      </BoxLinks>
    </>
  );
}

// Παραδοτέα που περιμένουν απάντηση από αυτόν τον Πελάτη (από την υπάρχουσα ουρά H1).
async function AwaitingClientDeliverables({ ctx }: { ctx: ClientPageCtx }) {
  const caps = deliverablesCaps(ctx.viewer);
  if (!caps.canQueue) return null;
  const result = await listDeliverableQueue("client");
  if (!result.ok) return null;
  const items = result.data.filter((card) => card.client === ctx.client.name);
  if (items.length === 0) return null;
  return (
    <Sub title={`Περιμένουν τον πελάτη (${items.length})`}>
      <Lines label="Παραδοτέα στον πελάτη">
        {items.map((card) => (
          <Line
            key={card.id}
            mark="▶"
            isUrgent={card.isLate}
            tag={card.isLate ? "Καθυστερεί" : "Αναμένει πελάτη"}
            title={card.title}
            href={hrefOf("H2", { id: card.id })}
            sub={[
              card.production,
              card.deadline ? `προθεσμία ${fmtDate(card.deadline)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </Lines>
      <BoxLinks>
        <Link
          href={hrefOf("H1", { view: "client", client: ctx.client.name })}
        >
          Όλα στα Παραδοτέα →
        </Link>
      </BoxLinks>
    </Sub>
  );
}

function MonthStrip({ ctx }: { ctx: ClientPageCtx }) {
  const month = monthGlance(ctx.data.provisions, ctx.data.nextFilming);
  if (!month) return null;
  return (
    <Sub title="Αυτόν τον μήνα">
      <div className="pc-month-row" aria-label={month.text}>
        {month.meters.map((meter) => (
          <Meter key={meter.label} {...meter} />
        ))}
        {month.next && (
          <span className="part-sub">
            Επόμενο γύρισμα: <strong>{month.next}</strong>
          </span>
        )}
        {month.hasNoShoot && <Badge tone="attention">Χωρίς γύρισμα</Badge>}
      </div>
    </Sub>
  );
}

const isCurrentAgreement = (a: AgreementRow): boolean =>
  a.state === "active" || a.state === "signed" || a.state === "proposal";

function AgreementRows({ rows }: { rows: readonly AgreementRow[] }) {
  return (
    <Lines label="Συμφωνίες">
      {rows.map((agreement) => {
        const view = toAgreementRowView(agreement);
        const price = priceText(agreement);
        return (
          <Line
            key={agreement.id}
            mark={initialsOf(agreement.title)}
            isFaded={!isCurrentAgreement(agreement)}
            tag={
              <Badge tone={agreementTone(agreement.state)}>
                {view.statusLabel}
              </Badge>
            }
            title={agreement.title}
            href={hrefOf("D2", { id: agreement.id })}
            sub={[view.kindLabel, view.timeText, view.discountNote]
              .filter(Boolean)
              .join(" · ")}
            amount={
              price ?? <small>Ποσά: μόνο στις δικές σου Συμφωνίες.</small>
            }
            quick={
              agreement.state === "active" ? (
                <Link href={hrefOf("D2", { id: agreement.id })}>
                  Ανανέωση / Διακοπή →
                </Link>
              ) : undefined
            }
          />
        );
      })}
    </Lines>
  );
}

function SortedAgreements({ ctx }: { ctx: ClientPageCtx }) {
  const all = ctx.data.agreements ?? [];
  const current = all.filter(isCurrentAgreement);
  const past = all.filter((a) => !isCurrentAgreement(a));
  return (
    <Sub id="b2-agreements" title="Συμφωνίες">
      {all.length === 0 ? (
        <p className="muted">
          Καμία Συμφωνία ακόμα. Η πρώτη υπογεγραμμένη πρόταση θα εμφανιστεί εδώ.
        </p>
      ) : (
        <>
          {current.length > 0 && <AgreementRows rows={current} />}
          {past.length > 0 && (
            <details className="pc-more-rows">
              <summary>Παλιές Συμφωνίες ({past.length})</summary>
              <AgreementRows rows={past} />
            </details>
          )}
        </>
      )}
    </Sub>
  );
}

function SortedOpportunities({ ctx }: { ctx: ClientPageCtx }) {
  const openIds = new Set(ctx.d.openRows.map((row) => row.id));
  const closed = ctx.d.rows.filter((row) => !openIds.has(row.id));
  return (
    <Sub id="b2-opportunities" title="Ευκαιρίες">
      {ctx.d.openRows.length > 0 ? (
        <OpportunityLines rows={ctx.d.openRows} empty="" />
      ) : (
        <p className="muted">Καμία ανοιχτή Ευκαιρία.</p>
      )}
      {closed.length > 0 && (
        <details className="pc-more-rows">
          <summary>Ιστορικό Ευκαιριών ({closed.length})</summary>
          <OpportunityLines rows={closed} empty="" />
        </details>
      )}
    </Sub>
  );
}

export function WorkTab({ ctx }: { ctx: ClientPageCtx }) {
  const hasActiveAgreement = (ctx.data.agreements ?? []).some(
    (a) => a.state === "active" || a.state === "signed",
  );
  // Για Υποψήφιο (χωρίς ενεργή Συμφωνία) οι ανοιχτές Ευκαιρίες ανεβαίνουν πρώτες.
  const isProspect = !hasActiveAgreement && ctx.d.openRows.length > 0;
  return (
    <div id="b2-work" className="pc-tab-body">
      {isProspect && <SortedOpportunities ctx={ctx} />}
      <MonthStrip ctx={ctx} />
      <Suspense fallback={null}>
        <AwaitingClientDeliverables ctx={ctx} />
      </Suspense>
      {ctx.allowed.includes("productions") && (
        <Sub id="b2-productions" title="Παραγωγές">
          <Suspense fallback={<p className="ml-empty">Φορτώνουν…</p>}>
            <SortedProductions ctx={ctx} />
          </Suspense>
        </Sub>
      )}
      {ctx.allowed.includes("agreements") && <SortedAgreements ctx={ctx} />}
      {!isProspect && <SortedOpportunities ctx={ctx} />}
    </div>
  );
}

// Επικοινωνία: Συνομιλία ως συμπαγής λωρίδα πάνω, Δραστηριότητες πρώτες, «Τι στάλθηκε αυτόματα» κλειστό κάτω.
export function CommsTab({ ctx }: { ctx: ClientPageCtx }) {
  const has = (tab: "chat" | "activities" | "dispatches") =>
    ctx.allowed.includes(tab);
  return (
    <div id="b2-comms" className="pc-tab-body">
      {has("chat") && (
        <div id="b2-chat" className="pc-chat-bar">
          <span>
            <strong>Συνομιλία</strong>{" "}
            <small className="muted">με τους Χρήστες του Πελάτη</small>
          </span>
          <span className="ml-quick">
            <Link href={hrefOf("J2", { id: ctx.client.id })}>
              Άνοιγμα Συνομιλίας →
            </Link>
          </span>
        </div>
      )}
      {has("activities") && (
        <Sub id="b2-log" title="Δραστηριότητες">
          {ctx.data.activities === null ? (
            <ErrorNotice what="οι Δραστηριότητες" />
          ) : (
            <ActivityLog
              clientId={ctx.client.id}
              rows={ctx.data.activities}
              canLog={ctx.canEdit}
              kinds={ctx.data.lists?.activityKinds ?? []}
              openOpportunities={ctx.d.logOpportunities}
              isLines
            />
          )}
        </Sub>
      )}
      {has("dispatches") && (
        <details id="b2-sent" className="pc-more-rows">
          <summary>Τι στάλθηκε αυτόματα (email / ειδοποιήσεις)</summary>
          <SpacesClientSends
            clientId={ctx.client.id}
            hasHistoryLink={sendsCaps(ctx.viewer).canView}
            filter={ctx.sendsFilter}
          />
        </details>
      )}
    </div>
  );
}

// Χρήματα: 3 KPIs σύνοψης, clickable ληξιπρόθεσμα και links στα σπίτια τους (I5, I4, I1).
export function LedgerTab({ ctx }: { ctx: ClientPageCtx }) {
  const ledger = ctx.data.ledger;
  const toInvoice = ledger?.toInvoice ?? 0;
  return (
    <div id="b2-ledger" className="pc-tab-body">
      {ledger && (
        <div className="pc-kpi-row" aria-label="Σύνοψη Χρημάτων">
          <div className="b1-card pc-kpi">
            <strong>{fmtMoney(ledger.balance)}</strong>
            <span>Υπόλοιπο</span>
          </div>
          <div
            className="b1-card pc-kpi"
            data-warn={ledger.overdue > 0 ? "" : undefined}
          >
            <strong>{fmtMoney(ledger.overdue)}</strong>
            <span>Ληξιπρόθεσμα</span>
          </div>
          {ledger.toInvoice !== null && (
            <div className="b1-card pc-kpi">
              <strong>{fmtMoney(toInvoice)}</strong>
              <span>Προς τιμολόγηση</span>
            </div>
          )}
        </div>
      )}
      <p className="b2-line">{ctx.d.money ?? "Καμία κίνηση ακόμα."}</p>
      <OverdueInvoices ctx={ctx} />
      {ctx.data.ledgerFull && (
        <BoxLinks>
          <Link href={hrefOf("I5", { client: ctx.client.id })}>
            Όλες οι κινήσεις στην Καρτέλα →
          </Link>
          <Link href={hrefOf("I4", { client: ctx.client.id })}>
            Καταχώριση είσπραξης →
          </Link>
          {toInvoice > 0 && (
            <Link href={hrefOf("I1")}>Προς τιμολόγηση →</Link>
          )}
        </BoxLinks>
      )}
    </div>
  );
}

// Στοιχεία: στοιχεία (χωρίς Υπεύθυνο για 1 πωλητή), Πύλη με κλειστή φόρμα πρόσκλησης, και GDPR κλειστό.
export function DetailsTab({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <div id="b2-summary" className="pc-tab-body">
      <Details ctx={ctx} hideOwner={isSoloSales(ctx)} />
      {ctx.allowed.includes("users") && (
        <Sub title="Πύλη Πελάτη">
          <SpacesClientUsers
            clientId={ctx.client.id}
            clientName={ctx.client.name}
            viewer={ctx.viewer}
            collapseInvite
          />
        </Sub>
      )}
      {ctx.d.isOwner && (
        <details className="pc-more-rows">
          <summary>GDPR (Εξαγωγή &amp; Ανωνυμοποίηση)</summary>
          <SpacesGdprClientSection clientId={ctx.client.id} />
        </details>
      )}
    </div>
  );
}
