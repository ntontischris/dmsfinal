import {
  receivablesAging,
  reportCapsOf,
  revenueByClient,
  turnoverByMonth,
} from "@/data/reports-access";
import { ByClientBody, ReceivablesBody } from "@/screens/m1-finance-clients";
import { TurnoverBody } from "@/screens/m1-finance-turnover";
import type { ReportBodyProps } from "@/screens/m1-model";

import "./m1-finance.css";

export function FinanceReport(props: ReportBodyProps) {
  const { role, report, range, clientId, isEmpty, canExport } = props;
  const showAmounts = reportCapsOf(role).canSeeAmounts;
  const common = { role, showAmounts, isEmpty, canExport };
  if (report.id === "turnover") {
    return (
      <TurnoverBody
        rows={turnoverByMonth(range, clientId)}
        clientId={clientId}
        showAmounts={showAmounts}
        isEmpty={isEmpty}
        canExport={canExport}
      />
    );
  }
  if (report.id === "by-client") {
    return <ByClientBody {...common} rows={revenueByClient(range)} />;
  }
  if (report.id === "receivables") {
    return <ReceivablesBody {...common} rows={receivablesAging()} />;
  }
  return null;
}
