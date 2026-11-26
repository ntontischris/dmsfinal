// PROTOTYPE — throwaway. B «Πλακίδια»: αριστερά μια κολλητή κάρτα-σύνοψη (ποιος, σημείωση, ό,τι θέλει προσοχή, ενέργειες),
// δεξιά τέσσερις καρτέλες: Συνεργασία (πρώτη) · Επικοινωνία · Χρήματα · Στοιχεία (μαζί οι Άνθρωποι).
import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Box, Lines } from "../b2-box";
import { CommsBox, LedgerBox, PeopleBox, WorkBox } from "../b2-boxes";
import type { ClientPageCtx } from "../b2-context";
import { Summary, summaryHint } from "../b2-overview";
import { CLIENT_BOX_LABELS, type ClientBox } from "../b2-page-model";
import {
  AttentionLine,
  BackLink,
  CompactHero,
  DailyActions,
  MoneyLine,
  NextLine,
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

// Τα παλιά ?tab= (people, Άνθρωποι) πέφτουν στα Στοιχεία· χωρίς tab ανοίγει η Συνεργασία.
const tabOf = (raw: string | undefined, boxes: readonly ClientBox[]): Tab => {
  const wanted = raw === "people" ? "summary" : raw;
  const tab = TABS.find((t) => t === wanted);
  if (tab && (tab === "summary" || boxes.includes(tab))) return tab;
  return boxes.includes("work") ? "work" : "summary";
};

function TabBody({ ctx, tab }: { ctx: ClientPageCtx; tab: Tab }) {
  if (tab === "work") return <WorkBox ctx={ctx} isOpen />;
  if (tab === "comms") return <CommsBox ctx={ctx} isOpen />;
  if (tab === "ledger") return <LedgerBox ctx={ctx} isOpen />;
  return (
    <>
      <Box id="b2-summary" title="Στοιχεία" hint={summaryHint(ctx)} isOpen>
        <Summary ctx={ctx} />
      </Box>
      {ctx.boxes.includes("people") && <PeopleBox ctx={ctx} isOpen />}
    </>
  );
}

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
      {tabs.map((tab) => (
        <Link
          key={tab}
          href={clientHref(props.ctx, props.variant, { tab })}
          aria-current={tab === props.current ? "page" : undefined}
        >
          {TAB_LABELS[tab]}
        </Link>
      ))}
    </nav>
  );
}

// Η γραμμή «χρωστά» μόνο όταν όντως χρωστά.
function OwesLine({ ctx }: { ctx: ClientPageCtx }) {
  const isOwing =
    (ctx.data.overdueInvoices ?? []).length > 0 ||
    (ctx.data.ledger?.balance ?? 0) > 0;
  return isOwing ? <MoneyLine ctx={ctx} /> : null;
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

function NewInvoice({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.isReadOnly) return null;
  return (
    <span className="ml-quick" data-align="start">
      <Link href={hrefOf("I3", { client: ctx.client.id })}>Νέο τιμολόγιο</Link>
    </span>
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
          <Lines label="Μπροστά σου">
            <AttentionLine {...props} />
            <NextLine ctx={ctx} />
            <OwesLine ctx={ctx} />
          </Lines>
          <DailyActions ctx={ctx} />
          <NewInvoice ctx={ctx} />
        </aside>
        <section className="pc-main">
          <Selector {...props} current={current} />
          <TabBody ctx={ctx} tab={current} />
        </section>
      </div>
    </div>
  );
}
