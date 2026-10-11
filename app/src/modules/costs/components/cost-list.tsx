import Link from "next/link";

import { Notice } from "@/components/ui/notice";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { INTERNAL_LABEL, NO_VALUE_LABEL } from "../labels";
import {
  actualHours,
  estimateHours,
  formatHours,
  formatMoney,
  formatPercent,
  marginOf,
} from "../helpers";
import type { CostRow } from "../types";

import { SignalBadges } from "./signal-badges";

interface CostListProps {
  rows: readonly CostRow[];
  emptyText?: string;
}

// G3 και G1: οι γραμμές κόστους. Πίνακας στην οθόνη, κάρτες στο κινητό.
export function CostList({ rows, emptyText = "Καμία Παραγωγή σε αυτή την ομάδα." }: CostListProps) {
  if (rows.length === 0) {
    return (
      <Notice kind="empty" title="Καμία γραμμή εδώ">
        <p className="m-0">{emptyText}</p>
      </Notice>
    );
  }
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Παραγωγή</Th>
              <Th>Πελάτης</Th>
              <Th isNumeric>Εκτίμηση</Th>
              <Th isNumeric>Πραγματικό</Th>
              <Th isNumeric>Περιθώριο</Th>
              <Th>Σήματα</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CostTableRow key={row.productionId} row={row} />
            ))}
          </tbody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <CostCard key={row.productionId} row={row} />
        ))}
      </div>
    </>
  );
}

function CostTableRow({ row }: { row: CostRow }) {
  const margin = marginOf(row);
  return (
    <Tr>
      <Td data-label="Παραγωγή">
        <Link href={`/app/productions/${row.productionId}`} className="font-medium">
          {row.title}
        </Link>
      </Td>
      <Td data-label="Πελάτης">{row.client ?? INTERNAL_LABEL}</Td>
      <Td data-label="Εκτίμηση" isNumeric>
        {formatHours(estimateHours(row))} · {formatMoney(row.estimate.cost)}
      </Td>
      <Td data-label="Πραγματικό" isNumeric>
        {formatHours(actualHours(row))} · {formatMoney(row.actual.cost)}
      </Td>
      <Td data-label="Περιθώριο" isNumeric>
        {margin ? `${formatMoney(margin.amount)} (${formatPercent(margin.percent)})` : NO_VALUE_LABEL}
      </Td>
      <Td data-label="Σήματα">
        <SignalBadges signals={row.signals} />
      </Td>
    </Tr>
  );
}

function CostCard({ row }: { row: CostRow }) {
  const margin = marginOf(row);
  return (
    <article className="grid gap-2 rounded-md border bg-card p-3">
      <Link href={`/app/productions/${row.productionId}`} className="font-medium">
        {row.title}
      </Link>
      <p className="m-0 text-sm text-muted-foreground">{row.client ?? INTERNAL_LABEL}</p>
      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Εκτίμηση</dt>
        <dd className="m-0 text-right tabular-nums">
          {formatHours(estimateHours(row))} · {formatMoney(row.estimate.cost)}
        </dd>
        <dt className="text-muted-foreground">Πραγματικό</dt>
        <dd className="m-0 text-right tabular-nums">
          {formatHours(actualHours(row))} · {formatMoney(row.actual.cost)}
        </dd>
        <dt className="text-muted-foreground">Περιθώριο</dt>
        <dd className="m-0 text-right tabular-nums">
          {margin ? `${formatMoney(margin.amount)} (${formatPercent(margin.percent)})` : NO_VALUE_LABEL}
        </dd>
      </dl>
      <SignalBadges signals={row.signals} />
    </article>
  );
}
