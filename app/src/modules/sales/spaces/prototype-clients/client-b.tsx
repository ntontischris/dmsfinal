// PROTOTYPE — throwaway. B «Πλακίδια»: αριστερά μια κολλητή κάρτα-σύνοψη (ποιος, σημείωση, ό,τι θέλει προσοχή, ενέργειες),
// δεξιά τέσσερις καρτέλες: Συνεργασία (πρώτη) · Επικοινωνία · Χρήματα · Στοιχεία (μαζί οι Άνθρωποι).
import Link from "next/link";

import { fmtMoney } from "@/spaces/screens/shared";

import { BOX_OF_TAB, CLIENT_BOX_LABELS, type ClientBox } from "../b2-page-model";
import type { ClientPageCtx } from "../b2-context";
import { AheadLines, CardActions } from "./client-b-card";
import { CommsTab, DetailsTab, LedgerTab, WorkTab } from "./client-b-tabs";
import {
  BackLink,
  CompactHero,
  clientHref,
  type ProtoClientProps,
} from "./client-parts";
import { Sample } from "./list-parts";

type Tab = "work" | "comms" | "ledger" | "summary";
const TABS: readonly Tab[] = ["work", "comms", "ledger", "summary"];
const TAB_LABELS: Readonly<Record<Tab, string>> = {
  work: CLIENT_BOX_LABELS.work,
  comms: CLIENT_BOX_LABELS.comms,
  ledger: CLIENT_BOX_LABELS.ledger,
  summary: "Στοιχεία",
};

// T7: τα παλιά ?tab= (chat, activities, productions, people…) μεταφράζονται από το BOX_OF_TAB· οι Άνθρωποι είναι στα Στοιχεία.
const tabOf = (raw: string | undefined, boxes: readonly ClientBox[]): Tab => {
  const box = raw === undefined ? undefined : BOX_OF_TAB[raw];
  const wanted = box === "people" ? "summary" : box;
  const tab = TABS.find((t) => t === wanted);
  if (tab && (tab === "summary" || boxes.includes(tab))) return tab;
  return boxes.includes("work") ? "work" : "summary";
};

function TabBody({ ctx, tab }: { ctx: ClientPageCtx; tab: Tab }) {
  if (tab === "work") return <WorkTab ctx={ctx} />;
  if (tab === "comms") return <CommsTab ctx={ctx} />;
  if (tab === "ledger") return <LedgerTab ctx={ctx} />;
  return <DetailsTab ctx={ctx} />;
}

interface TabHint {
  text: string;
  isUrgent?: boolean;
}

const tabHintOf = (ctx: ClientPageCtx, tab: Tab): TabHint | null => {
  if (tab === "comms") {
    const count = ctx.data.activities?.length ?? 0;
    return count > 0 ? { text: String(count) } : null;
  }
  if (tab === "ledger") {
    const overdue = ctx.data.overdueInvoices?.length ?? 0;
    if (overdue > 0) return { text: `${overdue} ληξ.`, isUrgent: true };
    const balance = ctx.data.ledger?.balance ?? 0;
    return balance > 0 ? { text: fmtMoney(balance) } : null;
  }
  if (tab === "work") {
    const open = ctx.d.openRows.length;
    return open > 0 ? { text: String(open) } : null;
  }
  return null;
};

function Selector(props: ProtoClientProps & { current: Tab }) {
  const tabs = TABS.filter(
    (tab) => tab === "summary" || props.ctx.boxes.includes(tab),
  );
  return (
    <nav
      className="ml-quick pc-tabs"
      data-align="start"
      aria-label="Περιοχές του Πελάτη"
    >
      {tabs.map((tab) => {
        const hint = tabHintOf(props.ctx, tab);
        return (
          <Link
            key={tab}
            href={clientHref(props.ctx, props.variant, { tab })}
            aria-current={tab === props.current ? "page" : undefined}
          >
            {TAB_LABELS[tab]}
            {hint && (
              <span
                className="pc-tab-badge"
                data-urgent={hint.isUrgent ? "" : undefined}
              >
                {hint.text}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function TeamNote() {
  return (
    <p className="note pc-team-note">
      <strong>Σημείωση για την ομάδα</strong> <Sample />
      <br />
      <small>Μία γραμμή που βλέπουν όλοι, π.χ. «Μιλάμε μόνο με τη Μαρία».</small>
    </p>
  );
}

export function ClientB(props: ProtoClientProps) {
  const { ctx } = props;
  const current = tabOf(props.tab, ctx.boxes);
  return (
    <div className="pc-page">
      <BackLink variant={props.variant} />
      <div className="pc-split">
        <aside className="pc-aside">
          <CompactHero ctx={ctx} />
          <TeamNote />
          <AheadLines {...props} />
          <CardActions ctx={ctx} />
        </aside>
        <section className="pc-main">
          <Selector {...props} current={current} />
          <TabBody ctx={ctx} tab={current} />
        </section>
      </div>
    </div>
  );
}
