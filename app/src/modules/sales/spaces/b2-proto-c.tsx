// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Γ — «Ενημέρωση σαν το Σήμερα»: μία στήλη από πάνελ με τίτλο, η σύνοψη είναι η ίδια η ενημέρωση.

import Link from "next/link";

import { NO_MANAGER_LABEL } from "../labels";
import type { B2Tab } from "./b2-adapter";
import { ClientContact } from "./b2-contact";
import {
  AttentionPanel,
  BriefPanel,
  HeaderActions,
  NextStepPanel,
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

const SECTIONS: readonly { id: B2Tab; label: string }[] = [
  { id: "opportunities", label: "Ευκαιρίες" },
  { id: "agreements", label: "Συμφωνίες" },
  { id: "productions", label: "Παραγωγές" },
  { id: "activities", label: "Δραστηριότητες" },
  { id: "chat", label: "Συνομιλία" },
  { id: "dispatches", label: "Τι στάλθηκε" },
  { id: "ledger", label: "Καρτέλα Πελάτη" },
];

function RelationPanel({ ctx }: { ctx: ProtoCtx }) {
  if (!ctx.allowed.includes("agreements") && !ctx.d.filming) return null;
  return (
    <BriefPanel part="relation" label="Σχέση">
      {ctx.allowed.includes("agreements") && (
        <p className="b2p-line">
          {ctx.d.activeAgreement
            ? `Συμφωνία: ${ctx.d.activeAgreement}.`
            : "Καμία ενεργή Συμφωνία ακόμα."}
          {ctx.d.agreementEnd && ` ${ctx.d.agreementEnd.text}.`}
        </p>
      )}
      {ctx.d.filming && (
        <p className="b2p-filming">Επόμενο γύρισμα: {ctx.d.filming.text}</p>
      )}
      <footer className="b2p-foot">
        <Link href={protoTabHref(ctx.client.id, "c", "agreements")}>
          Συμφωνίες →
        </Link>
      </footer>
    </BriefPanel>
  );
}

function MoneyPanel({ ctx }: { ctx: ProtoCtx }) {
  if (ctx.d.money === null) return null;
  return (
    <BriefPanel part="money" label="Χρήματα">
      <p className="b2p-line">{ctx.d.money}</p>
      <footer className="b2p-foot">
        <Link href={protoTabHref(ctx.client.id, "c", "ledger")}>
          Καρτέλα Πελάτη →
        </Link>
      </footer>
    </BriefPanel>
  );
}

function ContactPanel({ ctx }: { ctx: ProtoCtx }) {
  const { client } = ctx;
  return (
    <BriefPanel part="contact" label="Επικοινωνία">
      <div className="b2p-contact" data-style="row">
        <ClientContact key={client.id} client={client} canEdit={ctx.canEdit} />
      </div>
      <p className="muted b2p-line">
        {!ctx.isReadOnly &&
          `Υπεύθυνος: ${client.managerName ?? NO_MANAGER_LABEL} · `}
        {[client.legalName, client.city, client.afm && `ΑΦΜ ${client.afm}`]
          .filter(Boolean)
          .join(" · ") || "Χωρίς Επωνυμία, Πόλη ή ΑΦΜ"}
      </p>
    </BriefPanel>
  );
}

export function VariantC({ ctx }: { ctx: ProtoCtx }) {
  const tabs: ProtoTab[] = [
    ...SECTIONS.filter((tab) => ctx.allowed.includes(tab.id)),
    ...(hasUsersView(ctx) ? [{ id: "users", label: usersLabel(ctx) }] : []),
  ];
  const active =
    tabs.find((tab) => tab.id === ctx.tab)?.id ??
    tabs[0]?.id ??
    "opportunities";
  return (
    <div className="b2p" data-variant="c">
      <ProtoTitle ctx={ctx}>
        <HeaderActions ctx={ctx} />
      </ProtoTitle>
      <ProtoLead ctx={ctx} />
      <ProtoSteps ctx={ctx} />
      <ProtoNotices ctx={ctx} />
      <div className="b2p-pair">
        <AttentionPanel ctx={ctx} />
        <NextStepPanel ctx={ctx} />
      </div>
      <div className="b2p-pair">
        <RelationPanel ctx={ctx} />
        <MoneyPanel ctx={ctx} />
      </div>
      <ContactPanel ctx={ctx} />
      <ProtoTabs ctx={ctx} tabs={tabs} active={active} isScrolling />
      <div className="b2p-quiet-empty">
        {active === "users" ? (
          <UsersAndGdpr ctx={ctx} />
        ) : (
          ctx.renderTab(active as B2Tab)
        )}
      </div>
    </div>
  );
}
