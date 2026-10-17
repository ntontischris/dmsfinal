// Τα φίλτρα ζουν στη διεύθυνση (Ρ3): ένας σελιδοδείκτης ξανανοίγει την ίδια Αναφορά με τα ίδια φίλτρα.
// Οι Περίοδοι υπολογίζονται στη βάση· εδώ μόνο αναγνωρίζεται ο κωδικός τους.

export const REPORTS_PATH = "/app/reports";

export const PERIOD_CODES = [
  "this-month",
  "last-month",
  "this-quarter",
  "this-year",
  "last-year",
] as const;
export type PeriodCode = (typeof PERIOD_CODES)[number];
export const DEFAULT_PERIOD: PeriodCode = "this-year";

export interface ReportQuery {
  report?: string;
  period?: PeriodCode;
  client?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const single = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const isPeriodCode = (value: string): value is PeriodCode =>
  PERIOD_CODES.some((code) => code === value);

export const parsePeriod = (value: string | string[] | undefined): PeriodCode =>
  PERIOD_CODES.find((code) => code === single(value)) ?? DEFAULT_PERIOD;

export const parseClient = (
  value: string | string[] | undefined,
): string | undefined => {
  const text = single(value);
  return text && UUID.test(text) ? text : undefined;
};

export const parseReportId = (
  value: string | string[] | undefined,
): string | undefined => single(value)?.trim() || undefined;

// Η διεύθυνση μιας Αναφοράς. Η προεπιλεγμένη Περίοδος δεν γράφεται, ώστε ο σύνδεσμος να μένει κοντός.
export const reportHref = (query: ReportQuery): string => {
  const params = new URLSearchParams();
  if (query.report) params.set("report", query.report);
  if (query.period && query.period !== DEFAULT_PERIOD)
    params.set("period", query.period);
  if (query.client) params.set("client", query.client);
  const search = params.toString();
  return search ? `${REPORTS_PATH}?${search}` : REPORTS_PATH;
};

export const clientHref = (clientId: string): string =>
  `/app/clients/${encodeURIComponent(clientId)}`;

export const ledgerHref = (clientId: string): string =>
  `/app/finance/ledger?client=${encodeURIComponent(clientId)}`;
