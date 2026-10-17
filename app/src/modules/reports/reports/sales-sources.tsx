import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import type { ReportBodyProps, ReportDefinition } from "../catalog/types";
import {
  ReportEmpty,
  ReportError,
  ReportNote,
} from "../components/report-parts";
import { dateLabel, percentOrDash } from "../format";
import { TOTAL_LABEL } from "../labels";
import { canSeeSalesReports } from "../sales-access";
import { managerLabel, opportunityHref } from "../sales-helpers";
import { getSalesSources } from "../sales-queries";
import type { SalesSources } from "../sales-schema";
import { MANAGER_COLUMN, SalesFrame } from "./sales-parts";

// Πηγές Ευκαιριών (M1): οι Ευκαιρίες που άνοιξαν μέσα στην περίοδο, ανά Πηγή, και τι έγιναν ως σήμερα. Μόνο πλήθη.
// Κάθε Ευκαιρία της περιόδου ανοίγει τη σελίδα της.

const TITLE = "Πηγές Ευκαιριών";

const COLUMNS = {
  source: "Πηγή",
  opened: "Άνοιξαν",
  won: "Κερδήθηκαν",
  lost: "Χάθηκαν",
  open: "Ακόμα ανοιχτές",
  rate: "Ποσοστό επιτυχίας",
  opportunity: "Ευκαιρία",
  outcome: "Σήμερα",
  createdOn: "Άνοιξε",
} as const;

const OUTCOME = { open: "Ανοιχτή", won: "Κερδισμένη", lost: "Χαμένη" } as const;

function SourcesTable({ data }: { data: SalesSources }) {
  const lines = [
    ...data.rows,
    { ...data.totals, sourceId: "", label: TOTAL_LABEL },
  ];
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.source}</Th>
          <Th isNumeric>{COLUMNS.opened}</Th>
          <Th isNumeric>{COLUMNS.won}</Th>
          <Th isNumeric>{COLUMNS.lost}</Th>
          <Th isNumeric>{COLUMNS.open}</Th>
          <Th isNumeric>{COLUMNS.rate}</Th>
        </tr>
      </thead>
      <tbody>
        {lines.map((row) => (
          <Tr key={row.sourceId || "total"}>
            <Td
              data-label={COLUMNS.source}
              className={row.sourceId ? undefined : "font-semibold"}
            >
              {row.label}
            </Td>
            <Td data-label={COLUMNS.opened} isNumeric>
              {row.opened}
            </Td>
            <Td data-label={COLUMNS.won} isNumeric>
              {row.won}
            </Td>
            <Td data-label={COLUMNS.lost} isNumeric>
              {row.lost}
            </Td>
            <Td data-label={COLUMNS.open} isNumeric>
              {row.open}
            </Td>
            <Td data-label={COLUMNS.rate} isNumeric>
              {percentOrDash(row.winRate)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

function OpportunitiesTable({ data }: { data: SalesSources }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.opportunity}</Th>
          <Th>{COLUMNS.source}</Th>
          <Th>{COLUMNS.createdOn}</Th>
          <Th>{COLUMNS.outcome}</Th>
          {data.showSeller && <Th>{MANAGER_COLUMN}</Th>}
        </tr>
      </thead>
      <tbody>
        {data.opportunities.map((row) => (
          <Tr key={row.opportunityId}>
            <Td data-label={COLUMNS.opportunity}>
              <Link href={opportunityHref(row.opportunityId)}>{row.title}</Link>
              <span className="block text-sm text-muted-foreground">
                {row.clientName}
              </span>
            </Td>
            <Td data-label={COLUMNS.source}>{row.sourceLabel}</Td>
            <Td data-label={COLUMNS.createdOn}>{dateLabel(row.createdOn)}</Td>
            <Td data-label={COLUMNS.outcome}>
              <Badge tone={row.outcome === "won" ? "strong" : undefined}>
                {OUTCOME[row.outcome]}
              </Badge>
            </Td>
            {data.showSeller && (
              <Td data-label={MANAGER_COLUMN}>
                {managerLabel(row.managerName)}
              </Td>
            )}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

async function SalesSourcesBody({ report, filters, actions }: ReportBodyProps) {
  const result = await getSalesSources(filters.period, filters.sellerId);
  if (!result.ok) return <ReportError title={TITLE} />;
  const data = result.data;
  const frame = {
    reportId: report.id,
    period: filters.period,
    sellerId: filters.sellerId,
    header: data,
  };
  if (data.totals.opened === 0) {
    return (
      <SalesFrame {...frame} amounts actions={null}>
        <ReportEmpty title="Καμία νέα Ευκαιρία">
          Δεν άνοιξε καμία Ευκαιρία σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
        </ReportEmpty>
      </SalesFrame>
    );
  }
  return (
    <SalesFrame {...frame} amounts actions={actions}>
      <SourcesTable data={data} />
      <ReportNote>
        Μετρά τις Ευκαιρίες που άνοιξαν μέσα στην περίοδο, με την Έκβασή τους
        σήμερα.
      </ReportNote>
      <OpportunitiesTable data={data} />
    </SalesFrame>
  );
}

export const SALES_SOURCES: ReportDefinition = {
  id: "sources",
  family: "sales",
  title: TITLE,
  answers: "Ποιες Πηγές φέρνουν δουλειά.",
  basis:
    "Οι Ευκαιρίες που άνοιξαν μέσα στην περίοδο (ώρα Ελλάδας), ανά Πηγή, και τι έγιναν ως σήμερα: ανοιχτές, κερδισμένες, χαμένες. Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες).",
  usesPeriod: true,
  isVisible: canSeeSalesReports,
  Body: SalesSourcesBody,
};
