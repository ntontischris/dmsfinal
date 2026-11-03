// Το μοντέλο της Κερδοφορίας (prototype `screens/i7-model.ts`). Οι γραμμές έρχονται από την profitability_view αντί για
// τα mock· οι ομαδοποιήσεις (ανά Πελάτη, ανά μήνα με χωριστή γραμμή για την εσωτερική δουλειά) μένουν ίδιες.

import { fmtPercent } from "@/spaces/screens/shared";

import type { ProfitRow } from "../expenses-schema";

const INTERNAL_LABEL = "Εσωτερική";

export interface ProductionRow {
  production: { id: string; title: string; clientId: string };
  clientName: string;
  month: string;
  internal: boolean;
  price: number | null;
  estimateCost: number | null;
  actualCost: number | null;
  margin: number | null;
  overrun: boolean;
  missingHours: boolean;
}

export const rowOf = (row: ProfitRow): ProductionRow => ({
  production: {
    id: row.productionId,
    title: row.title,
    clientId: row.clientId ?? "",
  },
  clientName: row.client ?? INTERNAL_LABEL,
  month: row.month,
  internal: row.isInternal,
  price: row.price,
  estimateCost: row.estimateCost,
  actualCost: row.actualCost,
  margin:
    row.price !== null && row.actualCost !== null
      ? row.price - row.actualCost
      : null,
  overrun: row.overrun,
  missingHours: !row.hoursComplete,
});

export const allRows = (rows: readonly ProfitRow[]): readonly ProductionRow[] =>
  rows.map(rowOf);

export interface GroupRow {
  key: string;
  label: string;
  counted: number;
  missing: number;
  price: number;
  cost: number;
  isInternal: boolean;
}

const sum = (
  rows: readonly ProductionRow[],
  pick: (r: ProductionRow) => number | null,
) => rows.reduce((s, r) => s + (pick(r) ?? 0), 0);

const groupOf = (
  key: string,
  label: string,
  rows: readonly ProductionRow[],
  isInternalGroup: boolean,
): GroupRow => {
  const counted = rows.filter((r) => !r.missingHours);
  return {
    key,
    label,
    counted: counted.length,
    missing: rows.length - counted.length,
    price: sum(counted, (r) => r.price),
    cost: sum(counted, (r) => r.actualCost),
    isInternal: isInternalGroup,
  };
};

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort();

export const byClient = (
  rows: readonly ProductionRow[],
): readonly GroupRow[] => {
  const external = rows.filter((r) => !r.internal);
  return uniqueSorted(external.map((r) => r.production.clientId)).map((id) => {
    const own = external.filter((r) => r.production.clientId === id);
    return groupOf(id, own[0]?.clientName ?? "", own, false);
  });
};

// Ανά μήνα: μια γραμμή για τις Παραγωγές πελατών και χωριστή για την εσωτερική δουλειά.
export const byMonth = (rows: readonly ProductionRow[]): readonly GroupRow[] =>
  uniqueSorted(rows.map((r) => r.month)).flatMap((month) => {
    const inMonth = rows.filter((r) => r.month === month);
    const external = inMonth.filter((r) => !r.internal);
    const internal = inMonth.filter((r) => r.internal);
    return [
      ...(external.length > 0 ? [groupOf(month, month, external, false)] : []),
      ...(internal.length > 0
        ? [groupOf(`${month}-int`, month, internal, true)]
        : []),
    ];
  });

export const marginText = (price: number, cost: number): string =>
  price > 0 ? fmtPercent((price - cost) / price) : "—";

export const totalMissing = (groups: readonly GroupRow[]): number =>
  groups.reduce((s, g) => s + g.missing, 0);
