import type { ReactElement } from "react";

import { ErrorNotice } from "@/spaces/screens/shared";

import {
  getReceivablesAging,
  getTurnoverByClient,
  getTurnoverMonthly,
} from "../queries";
import {
  getExpensesByCategory,
  getPaymentMethods,
  getProductionsReport,
  getProfit,
} from "../money-queries";
import type { ReadResult } from "../read";
import type { PeriodCode } from "../url";
import { ByClientBody, ReceivablesBody } from "./m1-finance-clients";
import { PaymentMethodsBody, ProductionsBody } from "./m1-finance-counts";
import { ExpensesBody, ProfitBody } from "./m1-finance-money";
import { loadPeriods } from "./m1-finance-parts";
import { TurnoverBody } from "./m1-finance-turnover";
import { M1Filters } from "./m1-filters";
import type { ReportBodyProps } from "./m1-model";

import "./m1-finance.css";

const loadError = (title: string) => (
  <ErrorNotice what={`η Αναφορά «${title}»`} />
);

const mapResult = <T, U>(
  result: ReadResult<T>,
  map: (data: T) => U,
): ReadResult<U> => (result.ok ? { ok: true, data: map(result.data) } : result);

// Οι Αναφορές του παλιού DMS (d8): μόνο φίλτρο Περιόδου, ένα RPC, ένα σώμα.
const PERIOD_ONLY: Readonly<
  Record<
    string,
    (
      props: ReportBodyProps,
      period: PeriodCode,
    ) => Promise<ReadResult<ReactElement>>
  >
> = {
  expenses: async (props, period) =>
    mapResult(await getExpensesByCategory(period), (data) => (
      <ExpensesBody {...props} data={data} />
    )),
  profit: async (props, period) =>
    mapResult(await getProfit(period), (data) => (
      <ProfitBody {...props} data={data} />
    )),
  "payment-methods": async (props, period) =>
    mapResult(await getPaymentMethods(period), (data) => (
      <PaymentMethodsBody {...props} data={data} />
    )),
  productions: async (props, period) =>
    mapResult(await getProductionsReport(period), (data) => (
      <ProductionsBody {...props} data={data} />
    )),
};

async function PeriodOnlyReport(props: ReportBodyProps) {
  const load = PERIOD_ONLY[props.report.id];
  if (!load) return null;
  const query = { report: props.report.id, period: props.filters.period };
  const [periods, result] = await Promise.all([
    loadPeriods(),
    load(props, props.filters.period),
  ]);
  return (
    <>
      <M1Filters query={query} periods={periods} />
      {result.ok ? result.data : loadError(props.report.title)}
    </>
  );
}

// Οι οικονομικές Αναφορές (prototype `screens/m1-finance.tsx`): κάθε μία φέρνει το δικό της RPC και τις Περιόδους μαζί,
// ώστε τα φίλτρα (και οι Πελάτες του Τζίρου, που δίνει η βάση) να φαίνονται πάνω από τα δεδομένα.
export async function FinanceReport(props: ReportBodyProps) {
  const { report, filters } = props;
  const query = {
    report: report.id,
    period: filters.period,
    client: filters.clientId,
  };
  if (report.id === "turnover") {
    const [periods, result] = await Promise.all([
      loadPeriods(),
      getTurnoverMonthly(filters.period, filters.clientId),
    ]);
    const clients =
      result.ok && (result.data.clients.length > 1 || result.data.client)
        ? result.data.clients
        : undefined;
    return (
      <>
        <M1Filters query={query} periods={periods} clients={clients} />
        {result.ok ? (
          <TurnoverBody {...props} data={result.data} />
        ) : (
          loadError(report.title)
        )}
      </>
    );
  }
  if (report.id === "by-client") {
    const [periods, result] = await Promise.all([
      loadPeriods(),
      getTurnoverByClient(filters.period),
    ]);
    return (
      <>
        <M1Filters query={query} periods={periods} />
        {result.ok ? (
          <ByClientBody {...props} data={result.data} />
        ) : (
          loadError(report.title)
        )}
      </>
    );
  }
  if (report.id === "receivables") {
    const result = await getReceivablesAging();
    return result.ok ? (
      <ReceivablesBody {...props} data={result.data} />
    ) : (
      loadError(report.title)
    );
  }
  return <PeriodOnlyReport {...props} />;
}
