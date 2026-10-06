import { AGREEMENTS } from "@/data/agreements";
import { BILLABLES, RECEIPTS } from "@/data/finance";
import { liveInvoices } from "@/data/finance-access";
import {
  DEFAULT_PERIOD,
  EXPORT_FORMATS,
  type ExportDataset,
  type ExportFormat,
  type PeriodId,
} from "@/data/reports";
import { parsePeriod, periodRange } from "@/data/reports-access";
import type { RoleId } from "@/data/roles";
import { SALES_CLIENTS } from "@/data/sales";
import { screenHref, type ScreenQuery } from "@/screens/shared";

export const m2Href = (
  role: RoleId,
  query: ScreenQuery,
  change: Readonly<Record<string, string | undefined>>,
): string => screenHref(role, "M2", { ...query, ...change });

export const pickDataset = (
  list: readonly ExportDataset[],
  value: string | undefined,
): ExportDataset | undefined => list.find((d) => d.id === value) ?? list[0];

export const pickFormat = (value: string | undefined): ExportFormat =>
  EXPORT_FORMATS.find((f) => f.id === value)?.id ?? "xlsx";

export const pickPeriod = (value: string | undefined): PeriodId =>
  parsePeriod(value) ?? DEFAULT_PERIOD;

const within = (date: string, period: PeriodId): boolean => {
  const r = periodRange(period);
  return date >= r.from && date <= r.to;
};

// Πλήθος γραμμών· undefined όταν δεν υπολογίζεται εύκολα (εμφανίζεται «—»).
export const rowCountOf = (
  dataset: ExportDataset,
  period: PeriodId,
): number | undefined => {
  switch (dataset.id) {
    case "invoices":
      return liveInvoices().filter((i) => within(i.issueDate, period)).length;
    case "receipts":
      return RECEIPTS.filter((x) => within(x.date, period)).length;
    case "billables":
      return BILLABLES.filter((b) => within(b.date, period)).length;
    case "clients":
      return SALES_CLIENTS.length;
    case "agreements":
      return AGREEMENTS.length;
    default:
      return undefined;
  }
};
