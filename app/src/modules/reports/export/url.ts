import { DEFAULT_PERIOD, parsePeriod, type PeriodCode } from "../url";
import { isDatasetCode, type DatasetCode } from "./datasets";
import type { ExportFormat } from "./report-export";

// Οι επιλογές της M2 ζουν στη διεύθυνση (?dataset=&period=&format=&month=), όπως τα φίλτρα της M1.

export const EXPORT_PATH = "/app/reports/export";

export interface ExportQuery {
  dataset?: DatasetCode;
  period?: PeriodCode;
  format?: ExportFormat;
  month?: string;
}

const single = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const parseDatasetParam = (
  value: string | string[] | undefined,
): DatasetCode | undefined => {
  const text = single(value);
  return text && isDatasetCode(text) ? text : undefined;
};

export const parseFormat = (
  value: string | string[] | undefined,
): ExportFormat => (single(value) === "csv" ? "csv" : "xlsx");

export const parseMonth = (
  value: string | string[] | undefined,
): string | undefined => {
  const text = single(value);
  return text && /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? text : undefined;
};

export { parsePeriod };

export const exportHref = (query: ExportQuery): string => {
  const params = new URLSearchParams();
  if (query.dataset) params.set("dataset", query.dataset);
  if (query.period && query.period !== DEFAULT_PERIOD)
    params.set("period", query.period);
  if (query.format && query.format !== "xlsx")
    params.set("format", query.format);
  if (query.month) params.set("month", query.month);
  const search = params.toString();
  return search ? `${EXPORT_PATH}?${search}` : EXPORT_PATH;
};

// Οι μήνες του Πακέτου λογιστή: οι τελευταίοι 6 ως τον τρέχοντα (νεότερος πρώτος). Προεπιλογή: ο προηγούμενος μήνας,
// ο πρώτος που έχει κλείσει (η μηνιαία δουλειά του Λογιστή).
export const packMonths = (today: string, count = 6): string[] => {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
};

export const pickPackMonth = (
  months: readonly string[],
  value: string | undefined,
): string => months.find((month) => month === value) ?? months[1] ?? months[0];
