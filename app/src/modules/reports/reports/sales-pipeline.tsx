import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StatGrid } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import type { ReportBodyProps, ReportDefinition } from "../catalog/types";
import {
  ReportEmpty,
  ReportError,
  ReportNote,
} from "../components/report-parts";
import { dateLabel, moneyOrDash } from "../format";
import { TOTAL_LABEL } from "../labels";
import { canSeeSalesReports } from "../sales-access";
import {
  NO_MANAGER,
  monthlyOrDash,
  opportunityHref,
  opportunityValue,
} from "../sales-helpers";
import { getSalesPipeline } from "../sales-queries";
import type { SalesOpenRow, SalesPipeline } from "../sales-schema";
import { MANAGER_COLUMN, SalesFrame } from "./sales-parts";

// Ανοιχτές Ευκαιρίες ανά Στάδιο (M1): τι έχουμε στα σκαριά, σήμερα. Αξία = το σύνολο της τελευταίας πρότασης, μηνιαία και
// εφάπαξ χωριστά· χωρίς πρόταση «Χωρίς πρόταση», αλλά μετρά στο πλήθος. Κάθε Ευκαιρία ανοίγει τη σελίδα της.

const TITLE = "Ανοιχτές Ευκαιρίες ανά Στάδιο";

const COLUMNS = {
  stage: "Στάδιο",
  count: "Ευκαιρίες",
  monthly: "Μηνιαία αξία",
  oneOff: "Εφάπαξ αξία",
  without: "Χωρίς πρόταση",
  opportunity: "Ευκαιρία",
  value: "Αξία",
  next: "Επόμενο βήμα",
} as const;

function StagesTable({ data }: { data: SalesPipeline }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.stage}</Th>
          <Th isNumeric>{COLUMNS.count}</Th>
          <Th isNumeric>{COLUMNS.monthly}</Th>
          <Th isNumeric>{COLUMNS.oneOff}</Th>
          <Th isNumeric>{COLUMNS.without}</Th>
        </tr>
      </thead>
      <tbody>
        {[
          ...data.stages,
          { ...data.totals, stageId: "", label: TOTAL_LABEL },
        ].map((stage) => (
          <Tr key={stage.stageId || "total"}>
            <Td
              data-label={COLUMNS.stage}
              className={stage.stageId ? undefined : "font-semibold"}
            >
              {stage.label}
            </Td>
            <Td data-label={COLUMNS.count} isNumeric>
              {stage.count}
            </Td>
            <Td data-label={COLUMNS.monthly} isNumeric>
              {monthlyOrDash(stage.monthly)}
            </Td>
            <Td data-label={COLUMNS.oneOff} isNumeric>
              {moneyOrDash(stage.oneOff)}
            </Td>
            <Td data-label={COLUMNS.without} isNumeric>
              {stage.withoutProposal}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

function OpenLine({
  row,
  showManager,
}: {
  row: SalesOpenRow;
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
      <Td data-label={COLUMNS.stage}>{row.stageLabel}</Td>
      <Td data-label={COLUMNS.value} isNumeric>
        {opportunityValue(row.kind, row.value)}
      </Td>
      <Td data-label={COLUMNS.next}>
        {row.nextStepDue ? dateLabel(row.nextStepDue) : "—"}
      </Td>
      {showManager && (
        <Td data-label={MANAGER_COLUMN}>
          {row.managerName ?? <Badge tone="attention">{NO_MANAGER}</Badge>}
        </Td>
      )}
    </Tr>
  );
}

function OpenTable({ data }: { data: SalesPipeline }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.opportunity}</Th>
          <Th>{COLUMNS.stage}</Th>
          <Th isNumeric>{COLUMNS.value}</Th>
          <Th>{COLUMNS.next}</Th>
          {data.showSeller && <Th>{MANAGER_COLUMN}</Th>}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row) => (
          <OpenLine
            key={row.opportunityId}
            row={row}
            showManager={data.showSeller}
          />
        ))}
      </tbody>
    </Table>
  );
}

async function SalesPipelineBody({
  report,
  filters,
  actions,
}: ReportBodyProps) {
  const result = await getSalesPipeline(filters.sellerId);
  if (!result.ok) return <ReportError title={TITLE} />;
  const data = result.data;
  const frame = {
    reportId: report.id,
    sellerId: filters.sellerId,
    header: data,
  };
  if (data.totals.count === 0) {
    return (
      <SalesFrame {...frame} amounts actions={null}>
        <ReportEmpty title="Καμία ανοιχτή Ευκαιρία">
          Δεν υπάρχουν ανοιχτές Ευκαιρίες.
        </ReportEmpty>
      </SalesFrame>
    );
  }
  return (
    <SalesFrame {...frame} amounts={data.amounts} actions={actions}>
      <StatGrid
        items={[
          { label: "Ανοιχτές Ευκαιρίες", value: String(data.totals.count) },
          { label: COLUMNS.monthly, value: monthlyOrDash(data.totals.monthly) },
          { label: COLUMNS.oneOff, value: moneyOrDash(data.totals.oneOff) },
        ]}
      />
      <StagesTable data={data} />
      <OpenTable data={data} />
      <ReportNote>
        Αξία χωρίς ΦΠΑ, όπως στην τελευταία πρόταση. Η μηνιαία και η εφάπαξ δεν
        προστίθενται.
      </ReportNote>
    </SalesFrame>
  );
}

export const SALES_PIPELINE: ReportDefinition = {
  id: "pipeline",
  family: "sales",
  title: TITLE,
  answers: "Τι έχουμε στα σκαριά, σε ποιο Στάδιο και πόσο αξίζει.",
  basis:
    "Οι ανοιχτές Ευκαιρίες σήμερα, ανά Στάδιο. Αξία = το σύνολο της τελευταίας πρότασης (Συμφωνία της Ευκαιρίας), μηνιαία και εφάπαξ χωριστά. Όσες δεν έχουν πρόταση μετρούν στο πλήθος χωρίς αξία.",
  usesPeriod: false,
  isVisible: canSeeSalesReports,
  Body: SalesPipelineBody,
};
