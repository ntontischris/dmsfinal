import { PRODUCTIONS, type ProductionStub } from "@/data/filming";
import {
  actualOf,
  clientNameOfProduction,
  estimateOf,
  hasActualHours,
  isInternal,
  isOverrun,
  monthOf,
  priceOf,
} from "@/data/productions-access";
import { fmtPercent } from "@/screens/shared";

export interface ProductionRow {
  production: ProductionStub;
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

export const rowOf = (production: ProductionStub): ProductionRow => {
  const price = priceOf(production);
  const actual = actualOf(production);
  return {
    production,
    clientName: clientNameOfProduction(production),
    month: monthOf(production),
    internal: isInternal(production),
    price,
    estimateCost: estimateOf(production)?.cost ?? null,
    actualCost: actual?.cost ?? null,
    margin: price !== null && actual ? price - actual.cost : null,
    overrun: isOverrun(production),
    missingHours: !hasActualHours(production),
  };
};

export const allRows = (): readonly ProductionRow[] => PRODUCTIONS.map(rowOf);

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
    return groupOf(id, own[0].clientName, own, false);
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
