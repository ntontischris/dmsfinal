// PROTOTYPE — throwaway. Κοινά κομμάτια των παραλλαγών της λίστας, στο λεξιλόγιο των «Χρημάτων» (money-lines.css).
import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import type { SalesCaps } from "@/modules/sales/types";
import { b1ColumnsOf, type B1Row } from "../b1-adapter";
import { ClientsTable } from "../b1-clients-table";
import { B1FiltersBox } from "../b1-filters-box";
import {
  applyB1Filters,
  b1FilterGroups,
  type B1Filters,
} from "../b1-filters";
import {
  duplicatesOf,
  needsYou,
  reasonsOf,
  type Answer,
  type Pick,
  type PickSets,
} from "./list-model";
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
  // Ανανεώσεις (κάρτα «Λήγει η Συμφωνία» του Σήμερα) και ληξιπρόθεσμα (invoices_view).
  sets: PickSets;
  // Τα φίλτρα της διεύθυνσης (?status=, ?package=), μόνο μέσα στο «Δείξε όλους».
  filters: B1Filters;
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
  // Η αναζήτηση κρατά το πλακίδιο και το «Δείξε όλους».
  pick?: Pick | null;
  isAll?: boolean;
}) {
  return (
    <form
      className={props.isLarge ? "pc-search pc-search-large" : "pc-search"}
      method="get"
      action={hrefOf("B1")}
      role="search"
    >
      <input type="hidden" name="variant" value={props.variant} />
      {props.pick && <input type="hidden" name="pick" value={props.pick} />}
      {props.isAll && <input type="hidden" name="all" value="1" />}
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

// Ένας Πελάτης ως μικρή γραμμή-κάρτα: αρχικά, κατάσταση, όνομα, λόγοι προσοχής, μία φράση, Υπόλοιπο.
export function ClientCard({
  row,
  variant,
  today,
  sets,
}: {
  row: B1Row;
  variant: Variant;
  today?: string;
  sets?: PickSets;
}) {
  const reasons = today && sets ? reasonsOf(row, today, sets) : [];
  const isOverdue = sets?.overdue.has(row.id) === true;
  const isUrgent =
    today && sets ? reasons.some((reason) => reason.isUrgent) : needsYou(row);
  return (
    <li className="ml-line pc-card" data-urgent={isUrgent ? "" : undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(row.name)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">{row.status ?? "—"}</span>
        <strong>
          <Link href={withVariant(row.href, variant)}>{row.name}</Link>
        </strong>
        {reasons.length > 0 && (
          <span className="pc-reasons">
            {reasons.map((reason) => (
              <span
                key={reason.label}
                className="pc-reason"
                data-urgent={reason.isUrgent ? "" : undefined}
              >
                {reason.label}
              </span>
            ))}
          </span>
        )}
        <small>{glanceOf(row) || "—"}</small>
      </span>
      {row.hasBalance && (
        <span className="ml-amount">
          {row.balance}
          <small>{isOverdue ? "ληξιπρόθεσμο" : "υπόλοιπο"}</small>
        </span>
      )}
    </li>
  );
}

export function ClientCards(props: {
  rows: readonly B1Row[];
  variant: Variant;
  today?: string;
  sets?: PickSets;
  empty?: string;
}) {
  if (props.rows.length === 0)
    return <p className="ml-empty">{props.empty ?? "Κανένας εδώ."}</p>;
  return (
    <ul className="ml-list pc-cards">
      {props.rows.map((row) => (
        <ClientCard
          key={row.id}
          row={row}
          variant={props.variant}
          today={props.today}
          sets={props.sets}
        />
      ))}
    </ul>
  );
}

const NO_FILTERS = { status: null, isNoShoot: false, pkg: null } as const;

// Χωρίς φίλτρο Κατάστασης (και χωρίς αναζήτηση) η πλήρης λίστα κρύβει τους Ανενεργούς.
// Στην αναζήτηση (?q=) ψάχνουμε πάντα ΟΛΟΥΣ τους πελάτες, ώστε να βρίσκονται και οι Ανενεργοί.
export const shownRowsOf = (props: ProtoListProps): B1Row[] => {
  const filtered = applyB1Filters(props.rows, props.filters);
  if (props.query !== "") return filtered;
  return props.filters.status === null
    ? filtered.filter((row) => row.status !== "Ανενεργός")
    : filtered;
};

// Τα φίλτρα του «Δείξε όλους»: Κατάσταση (μέσα και οι Υποψήφιοι) και Πακέτο· οι σύνδεσμοι κρατούν παραλλαγή και «όλους».
export function AllFilters(props: ProtoListProps) {
  const groups = b1FilterGroups(props.rows, props.query, props.filters);
  const keep = (href: string) =>
    withVariant(href, props.variant, { all: "1" });
  const filters = groups.filters
    .filter((group) => group.label !== "Γύρισμα αυτόν τον μήνα")
    .map((group) => ({
      ...group,
      all: group.all && {
        ...group.all,
        label:
          group.label === "Κατάσταση"
            ? "ενεργοί και υποψήφιοι"
            : group.all.label,
        href: keep(group.all.href),
      },
      options: group.options.map((option) => ({
        ...option,
        href: keep(option.href),
      })),
    }));
  return <B1FiltersBox filters={filters} clearHref={keep(groups.clearHref)} />;
}

// Η πλήρης λίστα της σημερινής οθόνης (ίδιες γραμμές), με τους συνδέσμους να κρατούν την παραλλαγή.
export function FullList(props: ProtoListProps) {
  const rows = shownRowsOf(props).map((row) => ({
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

// «⋯»: οι σπάνιες δουλειές — Πιθανά διπλά, η Εξαγωγή (σπίτι της: Αναφορές → Εξαγωγή), ο Οδηγός.
export function ListMore(props: ProtoListProps) {
  const duplicates = duplicatesOf(props.rows);
  return (
    <details className="b2-menu">
      <summary aria-label="Περισσότερα">⋯</summary>
      <div className="b2-menu-body pc-menu">
        {props.caps.canMerge && (
          <Link href={hrefOf("B6")}>Πιθανά διπλά ({duplicates})</Link>
        )}
        <Link href={hrefOf("M2", { dataset: "clients" })}>
          Εξαγωγή Πελατών
        </Link>
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
        <ProtoSearch
          query={props.query}
          variant={props.variant}
          pick={props.pick}
          isAll={props.isAll}
        />
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
