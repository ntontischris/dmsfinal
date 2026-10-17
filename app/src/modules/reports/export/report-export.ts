import type {
  ReportDefinition,
  ReportExportParam,
  ReportExportSpec,
} from "../catalog/types";
import { toSheet, type ExportSheet } from "./columns";
import { fileName, periodPart } from "@/lib/export/file-name";
import { readReportHead } from "./view-schema";

// Η Εξαγωγή μιας Αναφοράς της M1 (Ργ), καθαρές συναρτήσεις: τα ορίσματα του RPC από τα φίλτρα και το φύλλο από το
// JSON της Αναφοράς, μόνο μέσω του exportSpec της (catalog/types.ts). Δεν ξέρει καμία συγκεκριμένη Αναφορά.

export type ExportFormat = "xlsx" | "csv";

export interface ReportExportFilters {
  period?: string;
  clientId?: string;
  sellerId?: string;
}

const ARG_NAMES: Record<ReportExportParam, string> = {
  period: "p_period",
  client: "p_client",
  seller: "p_seller",
};

const filterOf = (
  filters: ReportExportFilters,
  param: ReportExportParam,
): string | undefined =>
  param === "period"
    ? filters.period
    : param === "client"
      ? filters.clientId
      : filters.sellerId;

// Μόνο τα φίλτρα που δέχεται η Αναφορά, και μόνο όσα έχουν τιμή (όπως η σελίδα καλεί το ίδιο RPC).
export const reportArgs = (
  spec: ReportExportSpec,
  filters: ReportExportFilters,
): Record<string, string> =>
  Object.fromEntries(
    spec.params.flatMap((param) => {
      const value = filterOf(filters, param);
      return value ? [[ARG_NAMES[param], value]] : [];
    }),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const reportSheet = (
  title: string,
  spec: ReportExportSpec,
  data: unknown,
): ExportSheet => {
  const record = isRecord(data) ? data : {};
  const rows = record[spec.rowsKey];
  return toSheet(
    title,
    spec.columns,
    Array.isArray(rows) ? rows : [],
    spec.totals
      ? { values: record[spec.totals.key], label: spec.totals.label }
      : undefined,
  );
};

// «Τζίρος ανά Πελάτη 2026-01-01 – 2026-12-31.xlsx»· με Πελάτη στο φίλτρο, και το όνομά του.
export const reportFileName = (
  title: string,
  data: unknown,
  format: ExportFormat,
): string => {
  const head = readReportHead(isRecord(data) ? data : {});
  return fileName(
    [title, head.client?.name, periodPart(head.period) ?? head.today],
    format,
  );
};

export const exportableReport = (
  reports: readonly ReportDefinition[],
  id: string,
): (ReportDefinition & { exportSpec: ReportExportSpec }) | undefined => {
  const report = reports.find((item) => item.id === id);
  return report?.exportSpec
    ? { ...report, exportSpec: report.exportSpec }
    : undefined;
};
