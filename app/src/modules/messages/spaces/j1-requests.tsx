import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { requestsHref, type RequestView } from "../request-helpers";
import { STALE_BADGE, VIEW_LABELS } from "../request-labels";
import type { J1Request } from "./j1-adapter";

import "./j1.css";

// Η καρτέλα Αιτημάτων του prototype (`screens/j1-requests.tsx`) με τις πραγματικές όψεις και γραμμές.
export function ViewLinks({
  views,
  view,
}: {
  views: readonly RequestView[];
  view: RequestView;
}) {
  return (
    <p className="j1-views">
      {views.map((v) => (
        <Link
          key={v}
          className="button"
          data-primary={v === view}
          href={requestsHref(v)}
        >
          {VIEW_LABELS[v]}
        </Link>
      ))}
    </p>
  );
}

function Closing({ closing }: { closing: NonNullable<J1Request["closing"]> }) {
  return (
    <span className="j1-closing">
      <span className="part-sub">{closing.line}</span>
      {closing.isAutomatic && <p>έκλεισε μόνο του όταν δημιουργήθηκε</p>}
      {closing.isDone && closing.result && (
        <p>
          <Link href={closing.result.href}>{closing.result.label}</Link>
        </p>
      )}
      {closing.isDone && closing.link && <p>Σύνδεσμος: {closing.link}</p>}
      {closing.isDone && closing.comment && <p>{closing.comment}</p>}
      {!closing.isDone && closing.reply && <p>Απάντηση: {closing.reply}</p>}
    </span>
  );
}

function RequestItem({ m }: { m: J1Request }) {
  return (
    <ListRow
      lead={<Avatar name={m.clientName} size={40} />}
      title={m.kind}
      isFaded={!m.isOpen}
      sub={
        <>
          <span className="part-sub">
            {m.clientName}
            {m.productionTitle && ` · ${m.productionTitle}`}
          </span>
          {m.text && <span className="j1-req-text">{m.text}</span>}
          <span className="part-sub">{m.owner}</span>
          {m.closing && <Closing closing={m.closing} />}
        </>
      }
      aside={
        <>
          <Badge tone={m.isOpen ? "strong" : undefined}>{m.state}</Badge>
          {m.isStale && <Badge tone="attention">{STALE_BADGE}</Badge>}
          <Link className="button" href={m.href}>
            Άνοιγμα
          </Link>
        </>
      }
    />
  );
}

export function RequestList({ items }: { items: readonly J1Request[] }) {
  return (
    <Panel label="Αιτήματα" aside={items.length} isFlush>
      <RowList>
        {items.map((m) => (
          <RequestItem key={m.key} m={m} />
        ))}
      </RowList>
    </Panel>
  );
}
