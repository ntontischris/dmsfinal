import Link from "next/link";

import { SpacesClientUsers } from "@/modules/access";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import { SpacesClientSends, sendsCaps } from "@/modules/notifications";
import { hrefOf } from "@/spaces/data/screens";
import { Avatar } from "@/spaces/kit/parts";
import { ErrorNotice, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { BriefPanel, NextStepPanel, clientTabHref } from "./b2-briefing";
import type { ClientPageCtx } from "./b2-context";
import type { ClientTab } from "./b2-page-model";
import { ClientReminders } from "./b2-reminders";
import {
  ActivitiesSection,
  AgreementsSection,
  ChatSection,
  OpportunitiesSection,
} from "./b2-sections";
import { ProductionsTab } from "./b2-tabs";
import { ItemRows } from "./lane-rows";

// Τα σώματα των πέντε καρτελών (και της όψης «Χρήστες Πελάτη»). Οι ενότητες είναι οι ίδιες με πριν, ενωμένες ανά δουλειά.

function Overview({ ctx }: { ctx: ClientPageCtx }) {
  const top = ctx.d.openRows.slice(0, 3);
  const latest = (ctx.data.activities ?? []).slice(0, 3);
  return (
    <>
      <NextStepPanel ctx={ctx} />
      <BriefPanel
        part="next"
        label="Ανοιχτές Ευκαιρίες"
        aside={<Link href={clientTabHref(ctx.client.id, "sales")}>όλες →</Link>}
      >
        {top.length === 0 ? (
          <p className="muted b2-line">Καμία ανοιχτή Ευκαιρία.</p>
        ) : (
          <ItemRows
            items={top.map((row) => ({
              id: row.id,
              title: row.title,
              href: row.href,
              sub: row.sub,
              isHighlighted: row.isForgotten,
            }))}
          />
        )}
      </BriefPanel>
      {ctx.allowed.includes("agreements") && (
        <BriefPanel part="relation" label="Συμφωνία">
          <p className="b2-line">
            {ctx.d.activeAgreement
              ? `Ενεργή: ${ctx.d.activeAgreement}.`
              : "Καμία ενεργή Συμφωνία."}
            {ctx.d.agreementEnd && ` ${ctx.d.agreementEnd.text}.`}
          </p>
          {ctx.d.filming && (
            <p className="b2-filming">Επόμενο γύρισμα: {ctx.d.filming.text}</p>
          )}
        </BriefPanel>
      )}
      {ctx.data.reminders !== null && (
        <BriefPanel part="next" label="Υπενθυμίσεις μου">
          <ClientReminders
            clientId={ctx.client.id}
            reminders={ctx.data.reminders}
          />
        </BriefPanel>
      )}
      {ctx.data.activities !== null && (
        <BriefPanel
          part="log"
          label="Τελευταίες Δραστηριότητες"
          aside={
            <Link href={clientTabHref(ctx.client.id, "comms")}>όλες →</Link>
          }
        >
          {latest.length === 0 ? (
            <p className="muted b2-line">Καμία Δραστηριότητα ακόμα.</p>
          ) : (
            <ItemRows
              items={latest.map((row) => ({
                id: row.id,
                lead: <Avatar name={row.by} size={26} />,
                title: row.text,
                sub: `${row.when} · ${row.kind} · ${row.by}`,
              }))}
            />
          )}
        </BriefPanel>
      )}
    </>
  );
}

function Sales({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <>
      {/* «Νέα Ευκαιρία» είναι στην κεφαλίδα της σελίδας. */}
      <OpportunitiesSection
        client={ctx.client}
        canCreate={false}
        rows={ctx.d.rows}
      />
      {ctx.allowed.includes("agreements") && (
        <AgreementsSection agreements={ctx.data.agreements ?? []} />
      )}
    </>
  );
}

function OverdueInvoices({ ctx }: { ctx: ClientPageCtx }) {
  const items = ctx.data.overdueInvoices ?? [];
  if (items.length === 0) return null;
  return (
    <BriefPanel part="money" label="Ληξιπρόθεσμα Τιμολόγια">
      <ItemRows
        items={items.map((item) => ({
          id: item.id,
          title: `Τιμολόγιο ${item.number}`,
          sub: item.dueDate ? `έληγε ${fmtDate(item.dueDate)}` : undefined,
          aside: <span className="b2-num">{fmtMoney(item.remaining)}</span>,
        }))}
      />
    </BriefPanel>
  );
}

// Η Καρτέλα Πελάτη μέσα στη σελίδα, με σύνδεσμο στην πλήρη.
function Finance({ ctx }: { ctx: ClientPageCtx }) {
  const entries = ctx.data.ledgerEntries;
  return (
    <>
      {ctx.d.money && <p className="b2-lead b2-lead-sm">{ctx.d.money}</p>}
      <OverdueInvoices ctx={ctx} />
      <BriefPanel
        part="money"
        label="Καρτέλα Πελάτη"
        aside={
          ctx.data.ledgerFull && (
            <Link href={hrefOf("I5", { client: ctx.client.id })}>
              Άνοιγμα της Καρτέλας Πελάτη
            </Link>
          )
        }
      >
        {entries.length === 0 ? (
          <p className="muted b2-line">Καμία κίνηση ακόμα.</p>
        ) : (
          <ItemRows
            items={entries.map((entry, index) => ({
              id: `${entry.date}-${index}`,
              lead: <span className="b2-num">{fmtDate(entry.date)}</span>,
              title: entry.label,
              aside: (
                <span className="b2-num">
                  {entry.debit > 0
                    ? `+${fmtMoney(entry.debit)}`
                    : `−${fmtMoney(entry.credit)}`}{" "}
                  · {fmtMoney(entry.running)}
                </span>
              ),
            }))}
          />
        )}
      </BriefPanel>
    </>
  );
}

function Activities({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.data.activities === null)
    return <ErrorNotice what="οι Δραστηριότητες" />;
  return (
    <ActivitiesSection
      clientId={ctx.client.id}
      rows={ctx.data.activities}
      canLog={ctx.canEdit}
      kinds={ctx.data.lists?.activityKinds ?? []}
      openOpportunities={ctx.d.logOpportunities}
    />
  );
}

const COMMS_PARTS = [
  { id: "b2-chat", label: "Συνομιλία", tab: "chat" },
  { id: "b2-log", label: "Δραστηριότητες", tab: "activities" },
  { id: "b2-sent", label: "Τι στάλθηκε", tab: "dispatches" },
] as const;

// Συνομιλία, Δραστηριότητες και «Τι στάλθηκε» μαζί, με συνδέσμους μέσα στη σελίδα.
function Comms({ ctx }: { ctx: ClientPageCtx }) {
  const parts = COMMS_PARTS.filter((part) => ctx.allowed.includes(part.tab));
  return (
    <>
      <p className="b2-jump">
        {parts.map((part) => (
          <a key={part.id} href={`#${part.id}`}>
            {part.label}
          </a>
        ))}
      </p>
      {parts.map((part) => (
        <section key={part.id} id={part.id} className="b2-section">
          {part.tab === "chat" && <ChatSection clientId={ctx.client.id} />}
          {part.tab === "activities" && <Activities ctx={ctx} />}
          {part.tab === "dispatches" && (
            <SpacesClientSends
              clientId={ctx.client.id}
              hasHistoryLink={sendsCaps(ctx.viewer).canView}
              filter={ctx.sendsFilter}
            />
          )}
        </section>
      ))}
    </>
  );
}

function Users({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <>
      {ctx.allowed.includes("users") && (
        <SpacesClientUsers
          clientId={ctx.client.id}
          clientName={ctx.client.name}
          viewer={ctx.viewer}
        />
      )}
      {ctx.d.isOwner && <SpacesGdprClientSection clientId={ctx.client.id} />}
    </>
  );
}

export function ClientTabBody({
  ctx,
  tab,
}: {
  ctx: ClientPageCtx;
  tab: ClientTab;
}) {
  if (tab === "sales") return <Sales ctx={ctx} />;
  if (tab === "productions") return <ProductionsTab clientId={ctx.client.id} />;
  if (tab === "finance") return <Finance ctx={ctx} />;
  if (tab === "comms") return <Comms ctx={ctx} />;
  if (tab === "users") return <Users ctx={ctx} />;
  return <Overview ctx={ctx} />;
}
