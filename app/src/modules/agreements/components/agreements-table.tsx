"use client";

import { useState } from "react";

import { Table } from "@/components/ui/table";

import { filterRows } from "../helpers";
import type { AgreementRowView, BucketFilter, KindFilter } from "../types";

import {
  AgreementsHead,
  AgreementsRow,
  AgreementsToolbar,
  type AgreementColumns,
} from "./agreements-table-parts";

interface AgreementsTableProps {
  rows: readonly AgreementRowView[];
  columns: AgreementColumns;
  canSeeCost: boolean;
}

// Η D1: αναζήτηση, Προβολή και Είδος ζουν στον browser· οι γραμμές έρχονται έτοιμες και ήδη μορφοποιημένες.
// Η στήλη του ποσού υπάρχει μόνο όταν ο θεατής «Βλέπει ποσά» (αλλιώς η βάση στέλνει null).
export function AgreementsTable({
  rows,
  columns,
  canSeeCost,
}: AgreementsTableProps) {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<BucketFilter>("open");
  const [kind, setKind] = useState<KindFilter>("all");
  const visible = filterRows(rows, { query, kind, bucket });
  return (
    <div className="grid gap-3">
      <AgreementsToolbar
        query={query}
        bucket={bucket}
        kind={kind}
        count={visible.length}
        onQuery={setQuery}
        onBucket={setBucket}
        onKind={setKind}
      />
      {visible.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Τίποτα δεν ταιριάζει με την αναζήτηση.
        </p>
      ) : (
        <Table>
          <AgreementsHead columns={columns} />
          <tbody>
            {visible.map((row) => (
              <AgreementsRow
                key={row.id}
                row={row}
                columns={columns}
                canSeeCost={canSeeCost}
              />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
