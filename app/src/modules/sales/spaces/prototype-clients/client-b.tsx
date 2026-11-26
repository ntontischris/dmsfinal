// PROTOTYPE — throwaway. B «Πλακίδια»: αριστερά μια κολλητή κάρτα-σύνοψη (ποιος, χρήματα, επόμενο, ενέργειες),
// δεξιά ένα κουτί τη φορά με επιλογέα πάνω από τις πέντε περιοχές.
import Link from "next/link";

import { Box, Lines } from "../b2-box";
import { CommsBox, LedgerBox, PeopleBox, WorkBox } from "../b2-boxes";
import type { ClientPageCtx } from "../b2-context";
import { Summary, summaryHint } from "../b2-overview";
import { CLIENT_BOX_LABELS, openBoxOf, type ClientBox } from "../b2-page-model";
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

function BoxOf({ ctx, box }: { ctx: ClientPageCtx; box: ClientBox }) {
  if (box === "people") return <PeopleBox ctx={ctx} isOpen />;
  if (box === "work") return <WorkBox ctx={ctx} isOpen />;
  if (box === "comms") return <CommsBox ctx={ctx} isOpen />;
  if (box === "ledger") return <LedgerBox ctx={ctx} isOpen />;
  return (
    <Box id="b2-summary" title="Στοιχεία" hint={summaryHint(ctx)} isOpen>
      <Summary ctx={ctx} />
    </Box>
  );
}

const labelOf = (box: ClientBox): string =>
  box === "summary" ? "Στοιχεία" : CLIENT_BOX_LABELS[box];

function Selector(props: ProtoClientProps & { current: ClientBox }) {
  return (
    <nav
      className="ml-quick pc-tabs"
      data-align="start"
      aria-label="Περιοχές του Πελάτη"
    >
      {props.ctx.boxes.map((box) => (
        <Link
          key={box}
          href={clientHref(props.ctx, props.variant, { tab: box })}
          aria-current={box === props.current ? "page" : undefined}
        >
          {labelOf(box)}
        </Link>
      ))}
    </nav>
  );
}

export function ClientB(props: ProtoClientProps) {
  const { ctx } = props;
  const current = openBoxOf(props.tab, ctx.boxes) ?? "summary";
  return (
    <div className="pc-page">
      <BackLink variant={props.variant} />
      <div className="pc-split">
        <aside className="pc-aside">
          <CompactHero ctx={ctx} />
          <Lines label="Μπροστά σου">
            <AttentionLine {...props} />
            <NextLine ctx={ctx} />
            <MoneyLine ctx={ctx} />
          </Lines>
          <DailyActions ctx={ctx} />
        </aside>
        <section className="pc-main">
          <Selector {...props} current={current} />
          <BoxOf ctx={ctx} box={current} />
        </section>
      </div>
    </div>
  );
}
