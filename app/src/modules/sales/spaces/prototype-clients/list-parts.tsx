// PROTOTYPE — throwaway. Κοινά κομμάτια των παραλλαγών της λίστας, στο λεξιλόγιο των «Χρημάτων» (money-lines.css).
import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import type { SalesCaps } from "@/modules/sales/types";
import { b1ColumnsOf, type B1Row } from "../b1-adapter";
import { ClientsTable } from "../b1-clients-table";
import { duplicatesOf, needsYou, type Answer, type Pick } from "./list-model";
import { withVariant, type Variant } from "./variants";

export interface ProtoListProps {
  rows: readonly B1Row[];
  query: string;
  caps: SalesCaps;
  variant: Variant;
  pick: Pick | null;
  // «Δείξε όλους» (?all=1).
  isAll: boolean;
  today: string;
  // Τα έτοιμα κομμάτια της σημερινής οθόνης: «+ Νέα Ευκαιρία», οι κάρτες «Με μια ματιά», ο Οδηγός.
  newOpportunity: ReactNode;
  glance: ReactNode;
  guide: ReactNode;
}

export const listHref = (
  variant: Variant,
  extra: Readonly<Record<string, string | undefined>> = {},
): string => withVariant(hrefOf("B1"), variant, extra);

export const Sample = () => <span className="pc-sample">δείγμα</span>;

export function ProtoSearch(props: {
  query: string;
  variant: Variant;
  isLarge?: boolean;
}) {
  return (
    <form
      className={props.isLarge ? "pc-search pc-search-large" : "pc-search"}
      method="get"
      action={hrefOf("B1")}
      role="search"
    >
      <input type="hidden" name="variant" value={props.variant} />
      <input
        className="input"
        type="search"
        name="q"
        placeholder="Βρες πελάτη, πόλη, ΑΦΜ…"
        aria-label="Αναζήτηση πελάτη"
        defaultValue={props.query}
        autoComplete="off"
      />
    </form>
  );
}

export function AnswerLine({ answer, href }: { answer: Answer; href: string }) {
  return (
    <li
      className="ml-line pc-answer"
      data-urgent={answer.pick === "owes" ? "" : undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {answer.count}
      </span>
      <span className="ml-main">
        <strong>
          <Link href={href}>{answer.title}</Link>
        </strong>
        <small>{answer.names}</small>
      </span>
      <span className="ml-quick">
        <Link href={href}>Δες τους →</Link>
      </span>
    </li>
  );
}

const glanceOf = (row: B1Row): string =>
  [
    row.packageName,
    row.month?.next ? `γύρισμα ${row.month.next}` : null,
    row.month?.hasNoShoot ? "χωρίς γύρισμα" : null,
  ]
    .filter((part): part is string => !!part)
    .join(" · ") || row.city;

// Ένας Πελάτης ως μικρή γραμμή-κάρτα: αρχικά, κατάσταση, όνομα, μία φράση, Υπόλοιπο μόνο όταν χρωστά.
export function ClientCard({ row, variant }: { row: B1Row; variant: Variant }) {
  return (
    <li
      className="ml-line pc-card"
      data-urgent={needsYou(row) ? "" : undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(row.name)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">{row.status ?? "—"}</span>
        <strong>
          <Link href={withVariant(row.href, variant)}>{row.name}</Link>
        </strong>
        <small>{glanceOf(row) || "—"}</small>
      </span>
      {row.hasBalance && (
        <span className="ml-amount">
          {row.balance}
          <small>χρωστά</small>
        </span>
      )}
    </li>
  );
}

export function ClientCards(props: {
  rows: readonly B1Row[];
  variant: Variant;
  empty?: string;
}) {
  if (props.rows.length === 0)
    return <p className="ml-empty">{props.empty ?? "Κανένας εδώ."}</p>;
  return (
    <ul className="ml-list pc-cards">
      {props.rows.map((row) => (
        <ClientCard key={row.id} row={row} variant={props.variant} />
      ))}
    </ul>
  );
}

const NO_FILTERS = { status: null, isNoShoot: false, pkg: null } as const;

// Η πλήρης λίστα της σημερινής οθόνης (ίδιες γραμμές), με τους συνδέσμους να κρατούν την παραλλαγή.
export function FullList(props: ProtoListProps) {
  const rows = props.rows.map((row) => ({
    ...row,
    href: withVariant(row.href, props.variant),
  }));
  return (
    <ClientsTable
      rows={rows}
      filters={NO_FILTERS}
      {...b1ColumnsOf(rows, props.caps)}
    />
  );
}

export function FullListBox(props: ProtoListProps & { isOpen?: boolean }) {
  return (
    <details className="ml-box" open={props.isOpen}>
      <summary>
        <h2 className="ml-box-title">Όλοι οι πελάτες ({props.rows.length})</h2>
        <small>Η πλήρης λίστα, με την εικόνα του καθενός</small>
      </summary>
      <div className="pc-box-body">
        <FullList {...props} />
      </div>
    </details>
  );
}

export function GlanceBox({ glance }: { glance: ReactNode }) {
  if (!glance) return null;
  return (
    <details className="ml-box">
      <summary>
        <h2 className="ml-box-title">Με μια ματιά</h2>
        <small>Οι αριθμοί του Χώρου και το «Τώρα»</small>
      </summary>
      <div className="pc-box-body">{glance}</div>
    </details>
  );
}

// «⋯»: οι σπάνιες δουλειές — Πιθανά διπλά, η πλήρης λίστα με φίλτρα και στήλες, ο Οδηγός.
export function ListMore(props: ProtoListProps) {
  const duplicates = duplicatesOf(props.rows);
  return (
    <details className="b2-menu">
      <summary aria-label="Περισσότερα">⋯</summary>
      <div className="b2-menu-body pc-menu">
        {props.caps.canMerge && (
          <Link href={hrefOf("B6")}>Πιθανά διπλά ({duplicates})</Link>
        )}
        <Link href={hrefOf("B1")}>Πλήρης λίστα με φίλτρα και στήλες</Link>
        {props.guide}
      </div>
    </details>
  );
}

// Οι 2–3 καθημερινές ενέργειες: αναζήτηση, «+ Νέα Ευκαιρία», «⋯».
export function DailyBar(props: ProtoListProps & { hasSearch?: boolean }) {
  return (
    <div className="pc-bar">
      {props.hasSearch !== false && (
        <ProtoSearch query={props.query} variant={props.variant} />
      )}
      {props.newOpportunity}
      <ListMore {...props} />
    </div>
  );
}

export function PickedHead(props: {
  title: string;
  variant: Variant;
  query: string;
}) {
  return (
    <div className="pc-picked">
      <h2 className="ml-box-title">{props.title}</h2>
      <span className="ml-quick">
        <Link href={listHref(props.variant, { q: props.query || undefined })}>
          Καθάρισε ✕
        </Link>
      </span>
    </div>
  );
}

export const AllGood = ({ children }: { children?: ReactNode }) => (
  <p className="ml-empty pc-ok">
    <strong>Όλα εντάξει.</strong>{" "}
    {children ?? "Κανείς δεν σε χρειάζεται αυτή τη στιγμή."}
  </p>
);
