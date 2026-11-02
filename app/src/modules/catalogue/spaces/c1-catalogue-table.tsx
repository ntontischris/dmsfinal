"use client";

import { useState } from "react";

import { Entity } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { filterRows } from "../helpers";
import type { CatalogueRow, KindFilter } from "../types";

interface CatalogueTableProps {
  rows: readonly CatalogueRow[];
  showPrice: boolean;
  showCost: boolean;
  showMargin: boolean;
  showArchivedFilter: boolean;
}

const KINDS: readonly { id: KindFilter; label: string }[] = [
  { id: "all", label: "Όλα" },
  { id: "package", label: "Πακέτα" },
  { id: "service", label: "Υπηρεσίες" },
];

// Ο Κατάλογος (prototype `screens/c1-catalogue-table.tsx`): αναζήτηση, Είδος και αρχειοθετημένα στον browser.
// Η στήλη «Σε χρήση» λείπει: δεν υπάρχει ακόμα ανάγνωση με τις ενεργές Συμφωνίες ανά Πακέτο.
export function CatalogueTable({
  rows,
  showPrice,
  showCost,
  showMargin,
  showArchivedFilter,
}: CatalogueTableProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [withArchived, setWithArchived] = useState(false);
  const visible = filterRows(rows, { query, kind, withRetired: withArchived });

  return (
    <>
      <div className="toolbar">
        <input
          className="input grow"
          type="search"
          placeholder="Αναζήτηση στον Κατάλογο…"
          aria-label="Αναζήτηση στον Κατάλογο"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="select"
          aria-label="Είδος"
          value={kind}
          onChange={(event) => setKind(event.target.value as KindFilter)}
        >
          {KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        {showArchivedFilter && (
          <label className="muted">
            <input
              type="checkbox"
              checked={withArchived}
              onChange={(event) => setWithArchived(event.target.checked)}
            />{" "}
            και αρχειοθετημένα
          </label>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="muted">Τίποτα δεν ταιριάζει με την αναζήτηση.</p>
      ) : (
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Όνομα</th>
                <th>Παροχές</th>
                {showPrice && <th className="num">Τιμή</th>}
                {showCost && <th className="num">Εκτ. κόστος</th>}
                {showMargin && <th className="num">Περιθώριο</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className={row.isRetired ? "archived" : undefined}
                >
                  <td data-label="Όνομα">
                    <Entity name={row.name} href={row.href} sub={row.kindLabel}>
                      {(row.isPublic || row.isRetired) && (
                        <span className="btn-row">
                          {row.isPublic && <Badge>Δημόσιο</Badge>}
                          {row.isRetired && (
                            <Badge tone="faded">Αρχειοθετημένο</Badge>
                          )}
                        </span>
                      )}
                    </Entity>
                  </td>
                  <td data-label="Παροχές" className="muted">
                    {row.provisions || "—"}
                  </td>
                  {showPrice && (
                    <td className="num" data-label="Τιμή">
                      <strong>{row.price ?? "—"}</strong>
                    </td>
                  )}
                  {showCost && (
                    <td className="num" data-label="Εκτ. κόστος">
                      {row.cost ?? "—"}
                    </td>
                  )}
                  {showMargin && (
                    <td className="num" data-label="Περιθώριο">
                      {row.margin ?? "—"}{" "}
                      {row.isBelowMin && (
                        <Badge tone="attention">κάτω από την ελάχιστη</Badge>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
