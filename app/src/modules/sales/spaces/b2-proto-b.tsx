// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Β — «Πρώτα το τηλεφώνημα»: τι έγινε τελευταία, τι ακολουθεί, και καταγραφή χωρίς να φεύγεις.

import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import type { B2Tab } from "./b2-adapter";
import { ActivityLog } from "./b2-activity-log";
import { ClientContact } from "./b2-contact";
import { ClientNewOpportunity } from "./b2-new-opportunity";
import {
  BriefPanel,
  MoreMenu,
  ProtoLead,
  ProtoNotices,
  ProtoSteps,
  ProtoTabs,
  ProtoTitle,
  UsersAndGdpr,
  hasUsersView,
  usersLabel,
  type ProtoCtx,
  type ProtoTab,
} from "./b2-proto-parts";
import { protoTabHref } from "./b2-proto-model";
import { ItemRows } from "./lane-rows";

const MAIN: readonly { id: B2Tab | "summary"; label: string }[] = [
  { id: "summary", label: "Σύνοψη" },
  { id: "opportunities", label: "Ευκαιρίες" },
  { id: "agreements", label: "Συμφωνίες" },
  { id: "productions", label: "Παραγωγές" },
  { id: "activities", label: "Δραστηριότητες" },
];

const MORE: readonly { id: B2Tab; label: string }[] = [
  { id: "dispatches", label: "Τι στάλθηκε" },
  { id: "ledger", label: "Καρτέλα Πελάτη" },
  { id: "chat", label: "Συνομιλία" },
];

const isShown = (ctx: ProtoCtx, id: string): boolean =>
  id === "summary" || ctx.allowed.includes(id as B2Tab);

function NowBlock({ ctx }: { ctx: ProtoCtx }) {
  const last = ctx.proto.activities?.[0];
  const next = ctx.d.next;
  return (
    <BriefPanel part="now" label="Τώρα">
      <dl className="b2p-now">
        <dt>Τελευταία</dt>
        <dd>
          {last
            ? `${last.when} · ${last.by} · ${last.kind}: ${last.text}`
            : "Καμία Δραστηριότητα ακόμα."}
        </dd>
        <dt>Επόμενο βήμα</dt>
        <dd>
          {next ? (
            <>
              {next.step}, <span className="b2p-num">{next.due}</span>
              {next.isLate && <span className="b2p-rec"> πέρασε</span>} ·{" "}
              <Link href={hrefOf("B4", { id: next.opportunityId })}>
                {next.title}
              </Link>{" "}
              · {next.owner}
            </>
          ) : (
            "Κανένα: δεν υπάρχει ανοιχτή Ευκαιρία."
          )}
        </dd>
        {ctx.d.attention && (
          <>
            <dt className="b2p-rec-dot">Προσοχή</dt>
            <dd>
              {ctx.d.attention.text} ·{" "}
              <Link
                href={protoTabHref(ctx.client.id, "b", ctx.d.attention.tab)}
              >
                Λεπτομέρειες
              </Link>
            </dd>
          </>
        )}
      </dl>
    </BriefPanel>
  );
}

function LogBlock({ ctx }: { ctx: ProtoCtx }) {
  if (!ctx.canEdit && (ctx.proto.activities ?? []).length === 0) return null;
  return (
    <BriefPanel
      part="log"
      label="Καταγραφή"
      aside={
        <Link href={protoTabHref(ctx.client.id, "b", "activities")}>
          όλες →
        </Link>
      }
    >
      <ActivityLog
        clientId={ctx.client.id}
        rows={(ctx.proto.activities ?? []).slice(0, 3)}
        canLog={ctx.canEdit}
        kinds={ctx.data.lists?.activityKinds ?? []}
        openOpportunities={ctx.d.logOpportunities}
      />
    </BriefPanel>
  );
}

function MoneyLines({ ctx }: { ctx: ProtoCtx }) {
  if (ctx.d.money === null) return null;
  const overdue = ctx.proto.overdueInvoices ?? [];
  return (
    <BriefPanel part="money" label="Χρήματα">
      <p className="b2p-line">{ctx.d.money}</p>
      {overdue.length > 0 && (
        <ul className="b2p-list">
          {overdue.map((invoice) => (
            <li key={invoice.id}>
              <span className="b2p-rec-dot" /> Τιμολόγιο {invoice.number}:{" "}
              <strong className="b2p-num">{fmtMoney(invoice.remaining)}</strong>
              {invoice.dueDate && `, έληγε ${fmtDate(invoice.dueDate)}`}
            </li>
          ))}
        </ul>
      )}
      <footer className="b2p-foot">
        <Link href={protoTabHref(ctx.client.id, "b", "ledger")}>
          Καρτέλα Πελάτη →
        </Link>
      </footer>
    </BriefPanel>
  );
}

function Summary({ ctx }: { ctx: ProtoCtx }) {
  const rows = ctx.d.openRows;
  return (
    <>
      <MoneyLines ctx={ctx} />
      <BriefPanel
        part="next"
        label="Ανοιχτές Ευκαιρίες"
        aside={
          ctx.canEdit && ctx.card !== null ? (
            <ClientNewOpportunity
              clientId={ctx.client.id}
              clientName={ctx.client.name}
            />
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <p className="muted b2p-line">Καμία ανοιχτή Ευκαιρία.</p>
        ) : (
          <ItemRows
            items={rows.map((row) => {
              const agreement = ctx.data.agreements?.find(
                (a) => a.opportunityId === row.id,
              );
              return {
                id: row.id,
                title: row.title,
                href: row.href,
                sub: row.sub,
                isHighlighted: row.isForgotten,
                aside:
                  agreement && agreement.total !== null ? (
                    <strong className="b2p-num">
                      {fmtMoney(agreement.total)}
                    </strong>
                  ) : (
                    <span className="muted">χωρίς ποσό ακόμα</span>
                  ),
              };
            })}
          />
        )}
      </BriefPanel>
      {ctx.allowed.includes("agreements") && (
        <BriefPanel part="relation" label="Συμφωνία">
          <p className="b2p-line">
            {ctx.d.activeAgreement
              ? `Ενεργή: ${ctx.d.activeAgreement}.`
              : "Καμία ενεργή Συμφωνία."}
            {ctx.d.agreementEnd && ` ${ctx.d.agreementEnd.text}.`}
          </p>
          {ctx.d.filming && (
            <p className="b2p-filming">Επόμενο γύρισμα: {ctx.d.filming.text}</p>
          )}
        </BriefPanel>
      )}
    </>
  );
}

function Side({ ctx }: { ctx: ProtoCtx }) {
  const { client } = ctx;
  const phone = client.contactPhone.replace(/\s/g, "");
  return (
    <aside className="b2p-side kit-inspector" aria-label={client.name}>
      <div className="b2p-call">
        {phone !== "" && (
          <a className="button" data-primary="true" href={`tel:${phone}`}>
            Κλήση {client.contactPhone}
          </a>
        )}
        {client.contactEmail !== "" && (
          <a className="button" href={`mailto:${client.contactEmail}`}>
            Email
          </a>
        )}
      </div>
      <dl className="dl">
        {!ctx.isReadOnly && (
          <>
            <dt>Υπεύθυνος</dt>
            <dd>{client.managerName ?? NO_MANAGER_LABEL}</dd>
          </>
        )}
        <dt>Κύριο πρόσωπο</dt>
        <dd>
          <span className="b2p-contact" data-style="text">
            <ClientContact
              key={client.id}
              client={client}
              canEdit={ctx.canEdit}
            />
          </span>
        </dd>
        <dt>Επωνυμία</dt>
        <dd>{client.legalName || "—"}</dd>
        <dt>Πόλη</dt>
        <dd>{client.city || "—"}</dd>
        <dt>ΑΦΜ</dt>
        <dd className="num">{client.afm ?? "—"}</dd>
      </dl>
      <div className="kit-inspector-foot">
        <MoreMenu ctx={ctx} />
      </div>
    </aside>
  );
}

function TabBody({ ctx, tab }: { ctx: ProtoCtx; tab: string }) {
  if (tab === "users") return <UsersAndGdpr ctx={ctx} />;
  if (tab === "summary") return <Summary ctx={ctx} />;
  return ctx.renderTab(tab as B2Tab);
}

export function VariantB({ ctx }: { ctx: ProtoCtx }) {
  const tabs: ProtoTab[] = MAIN.filter((tab) => isShown(ctx, tab.id));
  const more: ProtoTab[] = [
    ...(hasUsersView(ctx) ? [{ id: "users", label: usersLabel(ctx) }] : []),
    ...MORE.filter((tab) => isShown(ctx, tab.id)),
  ];
  const raw = ctx.tab === "details" ? "summary" : (ctx.tab ?? "summary");
  const active = [...tabs, ...more].some((tab) => tab.id === raw)
    ? raw
    : "summary";
  const activeMore = more.find((tab) => tab.id === active);
  return (
    <div className="b2p" data-variant="b">
      <div className="b2p-split" data-side="start">
        <Side ctx={ctx} />
        <div className="b2p-main">
          <ProtoTitle ctx={ctx} />
          <ProtoLead ctx={ctx} />
          <ProtoSteps ctx={ctx} />
          <ProtoNotices ctx={ctx} />
          <NowBlock ctx={ctx} />
          <LogBlock ctx={ctx} />
          <ProtoTabs ctx={ctx} tabs={tabs} active={active}>
            {more.length > 0 && (
              <details className="b2p-menu b2p-more-tabs">
                <summary
                  className="tab"
                  aria-current={activeMore ? "page" : undefined}
                >
                  {activeMore ? activeMore.label : "Περισσότερα"} ▾
                </summary>
                <div className="b2p-menu-body">
                  {more.map((tab) => (
                    <Link
                      key={tab.id}
                      href={protoTabHref(ctx.client.id, "b", tab.id)}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </ProtoTabs>
          <TabBody ctx={ctx} tab={active} />
        </div>
      </div>
    </div>
  );
}
