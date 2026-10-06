"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/screens/shared";

export interface CatalogueRow {
  id: string;
  href: string;
  name: string;
  kind: "package" | "service";
  kindLabel: string;
  provisions: string;
  price: string;
  cost: string | null;
  margin: string | null;
  isBelowMin: boolean;
  isPublic: boolean;
  isArchived: boolean;
  activeAgreements: number;
}

interface CatalogueTableProps {
  rows: readonly CatalogueRow[];
  showCost: boolean;
  showArchivedFilter: boolean;
}

const KINDS = ["Όλα", "Πακέτα", "Υπηρεσίες"] as const;
type KindFilter = (typeof KINDS)[number];

const matchesKind = (row: CatalogueRow, kind: KindFilter): boolean =>
  kind === "Όλα" ||
  (kind === "Πακέτα" && row.kind === "package") ||
  (kind === "Υπηρεσίες" && row.kind === "service");

export function CatalogueTable({
  rows,
  showCost,
  showArchivedFilter,
}: CatalogueTableProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("Όλα");
  const [withArchived, setWithArchived] = useState(false);

  const visible = rows.filter(
    (row) =>
      matchesKind(row, kind) &&
      (withArchived || !row.isArchived) &&
      row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
            <option key={item}>{item}</option>
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
                <th className="num">Τιμή</th>
                {showCost && <th className="num">Εκτ. κόστος</th>}
                {showCost && <th className="num">Περιθώριο</th>}
                <th className="num">Σε χρήση</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className={row.isArchived ? "archived" : undefined}
                >
                  <td data-label="Όνομα">
                    <Link href={row.href}>{row.name}</Link>{" "}
                    <span className="muted">{row.kindLabel}</span>{" "}
                    {row.isPublic && <Badge>Δημόσιο</Badge>}{" "}
                    {row.isArchived && <Badge>Αρχειοθετημένο</Badge>}
                  </td>
                  <td data-label="Παροχές">{row.provisions}</td>
                  <td className="num" data-label="Τιμή">
                    {row.price}
                  </td>
                  {showCost && (
                    <td className="num" data-label="Εκτ. κόστος">
                      {row.cost}
                    </td>
                  )}
                  {showCost && (
                    <td className="num" data-label="Περιθώριο">
                      {row.margin}{" "}
                      {row.isBelowMin && (
                        <Badge tone="attention">κάτω από την ελάχιστη</Badge>
                      )}
                    </td>
                  )}
                  <td className="num" data-label="Σε χρήση">
                    {row.activeAgreements === 0
                      ? "—"
                      : `${row.activeAgreements} ενεργές Συμφωνίες`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
