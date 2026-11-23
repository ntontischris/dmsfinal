"use client";

import Link from "next/link";
import { useState } from "react";

import { filterRows } from "../helpers";
import type { CatalogueRow, KindFilter } from "../types";

interface CatalogueTableProps {
  rows: readonly CatalogueRow[];
  showPrice: boolean;
  showCost: boolean;
  showMargin: boolean;
  showArchivedFilter: boolean;
}

type Shown = Pick<CatalogueTableProps, "showPrice" | "showCost" | "showMargin">;

const KINDS: readonly { id: KindFilter; label: string }[] = [
  { id: "all", label: "Όλα" },
  { id: "package", label: "Πακέτα" },
  { id: "service", label: "Υπηρεσίες" },
];

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const joined = (parts: readonly (string | null)[]): string =>
  parts.filter((part): part is string => part !== null).join(" · ");

const tagOf = (row: CatalogueRow): string =>
  joined([
    row.kindLabel,
    row.isPublic ? "Δημόσιο" : null,
    row.isRetired ? "Αρχειοθετημένο" : null,
  ]);

// Κάτω από την τιμή: το εκτιμώμενο κόστος και το περιθώριο (οι παλιές στήλες), για όποιον τα βλέπει.
const costLine = (row: CatalogueRow, shown: Shown): string =>
  joined([
    shown.showCost ? `εκτ. κόστος ${row.cost ?? "—"}` : null,
    shown.showMargin ? `περιθώριο ${row.margin ?? "—"}` : null,
  ]);

// Η κρυφή κεφαλίδα του πίνακα: κρατά τα ονόματα των παλιών στηλών για τους αναγνώστες οθόνης.
const amountHead = (shown: Shown): string =>
  joined([
    shown.showPrice ? "Τιμή" : null,
    shown.showCost ? "Εκτ. κόστος" : null,
    shown.showMargin ? "Περιθώριο" : null,
  ]);

function CatalogueLine({ row, shown }: { row: CatalogueRow; shown: Shown }) {
  const costs = costLine(row, shown);
  return (
    <tr
      className="ml-line c1-line"
      data-kind={row.kind}
      data-faded={row.isRetired || undefined}
    >
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(row.name)}
      </td>
      <td className="ml-main">
        <span className="ml-tag">{tagOf(row)}</span>
        <strong>
          <Link href={row.href}>{row.name}</Link>
        </strong>
        <small>{row.provisions || "—"}</small>
      </td>
      {(shown.showPrice || shown.showCost) && (
        <td className="ml-amount">
          {shown.showPrice && (row.price ?? "—")}
          {costs && <small>{costs}</small>}
          {row.isBelowMin && (
            <small className="c1-warn">κάτω από την ελάχιστη</small>
          )}
        </td>
      )}
    </tr>
  );
}

interface FiltersProps {
  query: string;
  kind: KindFilter;
  withArchived: boolean;
  showArchivedFilter: boolean;
  onQuery: (value: string) => void;
  onKind: (value: KindFilter) => void;
  onArchived: (value: boolean) => void;
}

// Η αναζήτηση μένει πάντα ορατή· δίπλα της μόνο το Είδος και το «και αρχειοθετημένα».
function Filters(props: FiltersProps) {
  return (
    <div className="c1-filters">
      <input
        className="input"
        type="search"
        placeholder="Αναζήτηση στον Κατάλογο…"
        aria-label="Αναζήτηση στον Κατάλογο"
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
      />
      <select
        className="select"
        aria-label="Είδος"
        value={props.kind}
        onChange={(event) =>
          props.onKind(
            KINDS.find((item) => item.id === event.target.value)?.id ?? "all",
          )
        }
      >
        {KINDS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {props.showArchivedFilter && (
        <label>
          <input
            type="checkbox"
            checked={props.withArchived}
            onChange={(event) => props.onArchived(event.target.checked)}
          />
          και αρχειοθετημένα
        </label>
      )}
    </div>
  );
}

// Ο Κατάλογος ως γραμμές (μορφή «Χρημάτων»): πλακίδιο, Είδος, όνομα, Παροχές, και δεξιά η τιμή με κόστος/περιθώριο.
// Η στήλη «Σε χρήση» λείπει: δεν υπάρχει ακόμα ανάγνωση με τις ενεργές Συμφωνίες ανά Πακέτο.
export function CatalogueTable({
  rows,
  showArchivedFilter,
  ...shown
}: CatalogueTableProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [withArchived, setWithArchived] = useState(false);
  const visible = filterRows(rows, { query, kind, withRetired: withArchived });
  const head = amountHead(shown);
  return (
    <>
      <Filters
        query={query}
        kind={kind}
        withArchived={withArchived}
        showArchivedFilter={showArchivedFilter}
        onQuery={setQuery}
        onKind={setKind}
        onArchived={setWithArchived}
      />
      {visible.length === 0 ? (
        <p className="muted">Τίποτα δεν ταιριάζει με την αναζήτηση.</p>
      ) : (
        <table className="ml-table ml-list">
          <thead>
            <tr>
              <th>Αρχικά</th>
              <th>Όνομα · Παροχές</th>
              {head && <th>{head}</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <CatalogueLine key={row.id} row={row} shown={shown} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
