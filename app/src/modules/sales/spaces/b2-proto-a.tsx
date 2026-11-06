// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Α — «Πέντε ενωμένες καρτέλες»: ομαδοποίηση ανά δουλειά. Επισκόπηση, Πωλήσεις, Παραγωγές, Οικονομικά, Επικοινωνία,
// με πλαϊνή στήλη «Στοιχεία», «Σε αριθμούς» και «Χρήστες Πελάτη».

import Link from "next/link";

import { Inspector } from "@/spaces/kit/inspector";
import { Avatar } from "@/spaces/kit/parts";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import type { B2Tab } from "./b2-adapter";
import { ClientContact } from "./b2-contact";
import {
  AttentionPanel,
  BriefPanel,
  HeaderActions,
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

type ATab =
  "overview" | "sales" | "productions" | "finance" | "comms" | "users";

// Οι σημερινές καρτέλες (και οι σύνδεσμοί τους, π.χ. τα φίλτρα του «Τι στάλθηκε») πέφτουν στη σωστή ενωμένη καρτέλα.
const FROM_B2: Readonly<Record<B2Tab, ATab>> = {
  details: "overview",
  opportunities: "sales",
  agreements: "sales",
  productions: "productions",
  ledger: "finance",
  chat: "comms",
  activities: "comms",
  dispatches: "comms",
  users: "users",
};

const tabsOf = (ctx: ProtoCtx): ProtoTab[] =>
  [
    { id: "overview", label: "Επισκόπηση", on: true },
    { id: "sales", label: "Πωλήσεις", on: true },
    {
      id: "productions",
      label: "Παραγωγές",
      on: ctx.allowed.includes("productions"),
    },
    { id: "finance", label: "Οικονομικά", on: ctx.allowed.includes("ledger") },
    { id: "comms", label: "Επικοινωνία", on: true },
  ]
    .filter((tab) => tab.on)
    .map(({ id, label }) => ({ id, label }));

const resolveA = (ctx: ProtoCtx, tabs: readonly ProtoTab[]): ATab => {
  const raw = ctx.tab ?? "";
  const mapped = (FROM_B2 as Record<string, ATab | undefined>)[raw] ?? raw;
  if (mapped === "users" && hasUsersView(ctx)) return "users";
  return (tabs.find((tab) => tab.id === mapped)?.id ?? "overview") as ATab;
};

function Overview({ ctx }: { ctx: ProtoCtx }) {
  const top = ctx.d.openRows.slice(0, 3);
  const latest = (ctx.proto.activities ?? []).slice(0, 3);
  const salesHref = protoTabHref(ctx.client.id, "a", "sales");
  return (
    <>
      <BriefPanel
        part="next"
        label="Ανοιχτές Ευκαιρίες"
        aside={<Link href={salesHref}>όλες →</Link>}
      >
        {top.length === 0 ? (
          <p className="muted b2p-line">Καμία ανοιχτή Ευκαιρία.</p>
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
          <p className="b2p-line">
            {ctx.d.activeAgreement
              ? `Ενεργή: ${ctx.d.activeAgreement}`
              : "Καμία ενεργή Συμφωνία."}
            {ctx.d.agreementEnd && ` ${ctx.d.agreementEnd.text}.`}
          </p>
          {ctx.d.filming && (
            <p className="b2p-filming">Επόμενο γύρισμα: {ctx.d.filming.text}</p>
          )}
        </BriefPanel>
      )}
      <BriefPanel
        part="log"
        label="Τελευταίες Δραστηριότητες"
        aside={
          <Link href={protoTabHref(ctx.client.id, "a", "comms")}>όλες →</Link>
        }
      >
        {latest.length === 0 ? (
          <p className="muted b2p-line">Καμία Δραστηριότητα ακόμα.</p>
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
    </>
  );
}

function Finance({ ctx }: { ctx: ProtoCtx }) {
  const entries = ctx.proto.ledgerEntries ?? [];
  return (
    <>
      {ctx.d.money && <p className="b2p-lead b2p-lead-sm">{ctx.d.money}</p>}
      {entries.length > 0 && (
        <BriefPanel part="money" label="Κινήσεις Καρτέλας">
          <ItemRows
            items={entries.map((entry, index) => ({
              id: `${entry.date}-${index}`,
              lead: <span className="b2p-num">{fmtDate(entry.date)}</span>,
              title: entry.label,
              aside: (
                <span className="b2p-num">
                  {entry.debit > 0
                    ? `+${fmtMoney(entry.debit)}`
                    : `−${fmtMoney(entry.credit)}`}{" "}
                  · {fmtMoney(entry.running)}
                </span>
              ),
            }))}
          />
        </BriefPanel>
      )}
      {ctx.renderTab("ledger")}
    </>
  );
}

function Comms({ ctx }: { ctx: ProtoCtx }) {
  const parts = [
    { id: "b2p-chat", label: "Συνομιλία", tab: "chat" as const },
    { id: "b2p-log", label: "Δραστηριότητες", tab: "activities" as const },
    { id: "b2p-sent", label: "Τι στάλθηκε", tab: "dispatches" as const },
  ].filter((part) => ctx.allowed.includes(part.tab));
  return (
    <>
      <p className="b2p-jump">
        {parts.map((part) => (
          <a key={part.id} href={`#${part.id}`}>
            {part.label}
          </a>
        ))}
      </p>
      {parts.map((part) => (
        <section key={part.id} id={part.id} className="b2p-section">
          {ctx.renderTab(part.tab)}
        </section>
      ))}
    </>
  );
}

function TabBody({ ctx, tab }: { ctx: ProtoCtx; tab: ATab }) {
  if (tab === "sales")
    return (
      <>
        {ctx.renderTab("opportunities")}
        {ctx.allowed.includes("agreements") && ctx.renderTab("agreements")}
      </>
    );
  if (tab === "productions") return ctx.renderTab("productions");
  if (tab === "finance") return <Finance ctx={ctx} />;
  if (tab === "comms") return <Comms ctx={ctx} />;
  if (tab === "users") return <UsersAndGdpr ctx={ctx} />;
  return <Overview ctx={ctx} />;
}

function Side({ ctx }: { ctx: ProtoCtx }) {
  const { client, data } = ctx;
  const openCount = data.opportunities.filter(
    (o) => o.outcome === "open",
  ).length;
  return (
    <div className="b2p-side">
      <Inspector
        title="Στοιχεία"
        fields={[
          { label: "Επωνυμία", value: client.legalName || "—" },
          { label: "Πόλη", value: client.city || "—" },
          {
            label: "ΑΦΜ",
            value: <span className="num">{client.afm ?? "—"}</span>,
          },
          {
            label: "Κύριο πρόσωπο",
            value: (
              <span className="b2p-contact" data-style="icon">
                <ClientContact
                  key={client.id}
                  client={client}
                  canEdit={ctx.canEdit}
                />
              </span>
            ),
          },
          ...(ctx.isReadOnly
            ? []
            : [
                {
                  label: "Υπεύθυνος",
                  value: client.managerName ?? NO_MANAGER_LABEL,
                },
              ]),
        ]}
      />
      <BriefPanel part="facts" label="Σε αριθμούς">
        <dl className="b2p-facts">
          {!ctx.isReadOnly && (
            <>
              <dt>Ανοιχτές Ευκαιρίες</dt>
              <dd className="b2p-num">{openCount}</dd>
            </>
          )}
          {data.agreements !== null && (
            <>
              <dt>Συμφωνίες</dt>
              <dd className="b2p-num">{data.agreements.length}</dd>
            </>
          )}
          {data.ledger !== null && (
            <>
              <dt>Υπόλοιπο</dt>
              <dd className="b2p-num">{fmtMoney(data.ledger.balance)}</dd>
            </>
          )}
        </dl>
      </BriefPanel>
      {hasUsersView(ctx) && (
        <p>
          <Link href={protoTabHref(client.id, "a", "users")}>
            {usersLabel(ctx)} →
          </Link>
        </p>
      )}
    </div>
  );
}

export function VariantA({ ctx }: { ctx: ProtoCtx }) {
  const tabs = tabsOf(ctx);
  const active = resolveA(ctx, tabs);
  return (
    <div className="b2p" data-variant="a">
      <header className="b2p-head">
        <ProtoTitle ctx={ctx}>
          <HeaderActions ctx={ctx} />
        </ProtoTitle>
        {!ctx.isReadOnly && (
          <p className="muted b2p-line">
            Υπεύθυνος: {ctx.client.managerName ?? NO_MANAGER_LABEL}
          </p>
        )}
        <ProtoSteps ctx={ctx} />
      </header>
      <ProtoLead ctx={ctx} />
      <ProtoNotices ctx={ctx} />
      <AttentionPanel ctx={ctx} />
      <div className="b2p-split">
        <div className="b2p-main">
          <ProtoTabs ctx={ctx} tabs={tabs} active={active} />
          <TabBody ctx={ctx} tab={active} />
        </div>
        <Side ctx={ctx} />
      </div>
    </div>
  );
}
