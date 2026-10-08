"use client";

import { useState } from "react";

import { Table } from "@/components/ui/table";

import { filterRows } from "../helpers";
import type { CatalogueRow, KindFilter } from "../types";

import {
  CatalogueHead,
  CatalogueTableRow,
  CatalogueToolbar,
  type CatalogueColumns,
} from "./catalogue-table-parts";

interface CatalogueTableProps {
  rows: readonly CatalogueRow[];
  columns: CatalogueColumns;
  canSeeRetired: boolean;
}

// Η C1: αναζήτηση, φίλτρο είδους και «και αρχειοθετημένα» ζουν στον browser· οι γραμμές έρχονται έτοιμες και ήδη μορφοποιημένες.
// Οι στήλες χρημάτων υπάρχουν μόνο όταν ο θεατής δικαιούται να τις δει (η βάση στέλνει null αλλιώς).
export function CatalogueTable({
  rows,
  columns,
  canSeeRetired,
}: CatalogueTableProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [withRetired, setWithRetired] = useState(false);
  const visible = filterRows(rows, {
    query,
    kind,
    withRetired: canSeeRetired && withRetired,
  });
  return (
    <div className="grid gap-3">
      <CatalogueToolbar
        query={query}
        kind={kind}
        withRetired={withRetired}
        canSeeRetired={canSeeRetired}
        onQuery={setQuery}
        onKind={setKind}
        onWithRetired={setWithRetired}
      />
      {visible.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Τίποτα δεν ταιριάζει με την αναζήτηση.
        </p>
      ) : (
        <Table>
          <CatalogueHead columns={columns} />
          <tbody>
            {visible.map((row) => (
              <CatalogueTableRow key={row.id} row={row} columns={columns} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
