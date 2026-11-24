import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";

import { requestsHref, type RequestView } from "../request-helpers";
import { STALE_BADGE, VIEW_LABELS } from "../request-labels";
import { JCount } from "./j-empty";
import type { J1Request } from "./j1-adapter";

import "../../finance/spaces/money-lines.css";
import "./j1.css";

// Οι όψεις των Αιτημάτων ως φίλτρα της σελίδας (ίδιες διευθύνσεις `?tab=requests&view=…`).
export function ViewLinks({
  views,
  view,
}: {
  views: readonly RequestView[];
  view: RequestView;
}) {
  return (
    <nav className="page-filters j1-filters" aria-label="Όψη Αιτημάτων">
      {views.map((v) => (
        <Link
          key={v}
          href={requestsHref(v)}
          scroll={false}
          aria-current={v === view ? "page" : undefined}
        >
          {VIEW_LABELS[v]}
        </Link>
      ))}
    </nav>
  );
}

function Closing({ closing }: { closing: NonNullable<J1Request["closing"]> }) {
  return (
    <div className="j1-closing">
      <small>{closing.line}</small>
      {closing.isAutomatic && <p>έκλεισε μόνο του όταν δημιουργήθηκε</p>}
      {closing.isDone && closing.result && (
        <p>
          <Link href={closing.result.href}>{closing.result.label}</Link>
        </p>
      )}
      {closing.isDone && closing.link && <p>Σύνδεσμος: {closing.link}</p>}
      {closing.isDone && closing.comment && <p>{closing.comment}</p>}
      {!closing.isDone && closing.reply && <p>Απάντηση: {closing.reply}</p>}
    </div>
  );
}

function RequestItem({ m }: { m: J1Request }) {
  return (
    <li
      className="ml-line"
      data-faded={!m.isOpen || undefined}
      data-urgent={m.isStale || undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(m.clientName)}
      </span>
      <div className="ml-main">
        <span className="j1-tags">
          <span className="ml-tag">{m.state}</span>
          {m.isStale && <span className="ml-tag">{STALE_BADGE}</span>}
        </span>
        <strong>{m.kind}</strong>
        <small>
          {m.clientName}
          {m.productionTitle && ` · ${m.productionTitle}`}
        </small>
        {m.text && <span className="j1-req-text">{m.text}</span>}
        <small>{m.owner}</small>
        {m.closing && <Closing closing={m.closing} />}
      </div>
      <span aria-hidden="true" />
      <span className="ml-quick">
        <Link data-primary={m.isOpen || undefined} href={m.href}>
          Άνοιγμα
        </Link>
      </span>
    </li>
  );
}

export function RequestList({ items }: { items: readonly J1Request[] }) {
  return (
    <>
      <JCount n={items.length} one="Αίτημα" many="Αιτήματα" />
      <ul className="ml-list" aria-label="Αιτήματα">
        {items.map((m) => (
          <RequestItem key={m.key} m={m} />
        ))}
      </ul>
    </>
  );
}
