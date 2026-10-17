import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StatGrid } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import type { ReportBodyProps, ReportDefinition } from "../catalog/types";
import { ReportEmpty, ReportError } from "../components/report-parts";
import { dateLabel, moneyOrDash, percentOrDash } from "../format";
import { canSeeSalesReports } from "../sales-access";
import {
  managerLabel,
  monthlyOrDash,
  opportunityHref,
  opportunityValue,
} from "../sales-helpers";
import { getSalesResults } from "../sales-queries";
import type { SalesClosedRow, SalesResults } from "../sales-schema";
import { MANAGER_COLUMN, SalesFrame } from "./sales-parts";

// Κερδισμένες και χαμένες (M1): πόσες κλείσαμε, πόσες χάσαμε και γιατί, κατά ημερομηνία Έκβασης (ώρα Ελλάδας).
// Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες), από τη βάση. Κάθε Ευκαιρία ανοίγει τη σελίδα της.

const TITLE = "Κερδισμένες και χαμένες";

const COLUMNS = {
  opportunity: "Ευκαιρία",
  outcome: "Έκβαση",
  closedOn: "Ημερομηνία Έκβασης",
  value: "Αξία",
  reason: "Λόγος απώλειας",
  count: "Ευκαιρίες",
} as const;

const OUTCOME = { won: "Κερδισμένη", lost: "Χαμένη" } as const;

function ClosedLine({
  row,
  showManager,
}: {
  row: SalesClosedRow;
  showManager: boolean;
}) {
  return (
    <Tr>
      <Td data-label={COLUMNS.opportunity}>
        <Link href={opportunityHref(row.opportunityId)}>{row.title}</Link>
        <span className="block text-sm text-muted-foreground">
          {row.clientName}
        </span>
      </Td>
      <Td data-label={COLUMNS.outcome}>
        <Badge tone={row.outcome === "won" ? "strong" : undefined}>
          {OUTCOME[row.outcome]}
        </Badge>
        {row.lossReason && (
          <span className="block text-sm text-muted-foreground">
            {row.lossReason}
          </span>
        )}
      </Td>
      <Td data-label={COLUMNS.closedOn}>{dateLabel(row.closedOn)}</Td>
      <Td data-label={COLUMNS.value} isNumeric>
        {opportunityValue(row.kind, row.value)}
      </Td>
      {showManager && (
        <Td data-label={MANAGER_COLUMN}>{managerLabel(row.managerName)}</Td>
      )}
    </Tr>
  );
}

function ClosedTable({ data }: { data: SalesResults }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.opportunity}</Th>
          <Th>{COLUMNS.outcome}</Th>
          <Th>{COLUMNS.closedOn}</Th>
          <Th isNumeric>{COLUMNS.value}</Th>
          {data.showSeller && <Th>{MANAGER_COLUMN}</Th>}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row) => (
          <ClosedLine
            key={row.opportunityId}
            row={row}
            showManager={data.showSeller}
          />
        ))}
      </tbody>
    </Table>
  );
}

function LossReasons({ data }: { data: SalesResults }) {
  if (data.lossReasons.length === 0) return null;
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.reason}</Th>
          <Th isNumeric>{COLUMNS.count}</Th>
        </tr>
      </thead>
      <tbody>
        {data.lossReasons.map((reason) => (
          <Tr key={reason.reasonId}>
            <Td data-label={COLUMNS.reason}>{reason.label}</Td>
            <Td data-label={COLUMNS.count} isNumeric>
              {reason.count}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

const wonHint = (data: SalesResults): string | undefined =>
  data.amounts
    ? `${monthlyOrDash(data.totals.wonMonthly)} · ${moneyOrDash(data.totals.wonOneOff)} εφάπαξ`
    : undefined;

async function SalesResultsBody({ report, filters, actions }: ReportBodyProps) {
  const result = await getSalesResults(filters.period, filters.sellerId);
  if (!result.ok) return <ReportError title={TITLE} />;
  const data = result.data;
  const frame = {
    reportId: report.id,
    period: filters.period,
    sellerId: filters.sellerId,
    header: data,
  };
  if (data.rows.length === 0) {
    return (
      <SalesFrame {...frame} amounts actions={null}>
        <ReportEmpty title="Καμία Έκβαση στην περίοδο">
          Δεν έκλεισε καμία Ευκαιρία σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
        </ReportEmpty>
      </SalesFrame>
    );
  }
  return (
    <SalesFrame {...frame} amounts={data.amounts} actions={actions}>
      <StatGrid
        items={[
          {
            label: "Κερδισμένες",
            value: String(data.totals.won),
            hint: wonHint(data),
            tone: "ok",
          },
          { label: "Χαμένες", value: String(data.totals.lost) },
          {
            label: "Ποσοστό επιτυχίας",
            value: percentOrDash(data.totals.winRate),
          },
        ]}
      />
      <LossReasons data={data} />
      <ClosedTable data={data} />
    </SalesFrame>
  );
}

export const SALES_RESULTS: ReportDefinition = {
  id: "results",
  family: "sales",
  title: TITLE,
  answers: "Πόσες Ευκαιρίες κλείσαμε, πόσες χάσαμε και γιατί.",
  basis:
    "Οι Ευκαιρίες που πήραν Έκβαση μέσα στην περίοδο, κατά ημερομηνία Έκβασης σε ώρα Ελλάδας. Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες). Οι λόγοι απώλειας μετρούν πόσες χάθηκαν για τον καθένα.",
  usesPeriod: true,
  isVisible: canSeeSalesReports,
  Body: SalesResultsBody,
  exportSpec: {
    rpc: "report_sales_results",
    params: ["period", "seller"],
    rowsKey: "rows",
    columns: [
      { key: "title", header: COLUMNS.opportunity, type: "text" },
      { key: "clientName", header: "Πελάτης", type: "text" },
      { key: "managerName", header: "Υπεύθυνος", type: "text" },
      { key: "outcome", header: COLUMNS.outcome, type: "text", labels: OUTCOME },
      { key: "closedOn", header: COLUMNS.closedOn, type: "date" },
      { key: "lossReason", header: COLUMNS.reason, type: "text" },
      { key: "kind", header: "Είδος", type: "text", labels: { monthly: "Μηνιαία", one_off: "Εφάπαξ" } },
      { key: "value", header: COLUMNS.value, type: "money" },
    ],
  },
};
