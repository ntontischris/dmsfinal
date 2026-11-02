import { ErrorNotice } from "@/spaces/screens/shared";

import {
  getReceivablesAging,
  getTurnoverByClient,
  getTurnoverMonthly,
} from "../queries";
import { ByClientBody, ReceivablesBody } from "./m1-finance-clients";
import { loadPeriods } from "./m1-finance-parts";
import { TurnoverBody } from "./m1-finance-turnover";
import { M1Filters } from "./m1-filters";
import type { ReportBodyProps } from "./m1-model";

import "./m1-finance.css";

const loadError = (title: string) => (
  <ErrorNotice what={`η Αναφορά «${title}»`} />
);

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
  return null;
}
