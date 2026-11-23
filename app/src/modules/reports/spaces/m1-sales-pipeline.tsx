import Link from "next/link";

import { Entity } from "@/spaces/kit/parts";
import { Badge, StateNotice } from "@/spaces/screens/shared";

import { hrefOf } from "@/spaces/data/screens";
import type { SalesOpenRow, SalesPipeline } from "../sales-schema";
import { money, monthlyText, openSub } from "./m1-adapter";
import { NoAmountsNote } from "./m1-finance-parts";
import { ExportRow } from "./m1-export-row";
import type { ReportBodyProps } from "./m1-model";
import { initialsOf } from "./m1-box";
import { Cards, Section, opportunitiesHint, rowValue } from "./m1-sales-parts";

// Ανοιχτές Ευκαιρίες ανά Στάδιο (prototype `screens/m1-sales-pipeline.tsx`) πάνω στο report_sales_pipeline.
// Η βάση κρίνει Εύρος, Πωλητή και ποσά.

const KIND_TAGS = {
  monthly: "μηνιαία",
  one_off: "εφάπαξ",
  none: "χωρίς πρόταση",
} as const;

function OpenList({
  rows,
  showOwner,
}: {
  rows: readonly SalesOpenRow[];
  showOwner: boolean;
}) {
  return (
    <ul className="ml-list">
      {rows.map((row) => (
        <li
          key={row.opportunityId}
          className="ml-line"
          data-urgent={row.managerName === null || undefined}
        >
          <span className="ml-thumb" aria-hidden="true">
            {initialsOf(row.clientName)}
          </span>
          <span className="ml-main">
            <span className="ml-tag">{KIND_TAGS[row.kind ?? "none"]}</span>
            <strong>
              <Link href={hrefOf("B4", { id: row.opportunityId })}>
                {`${row.title} · ${row.clientName}`}
              </Link>
            </strong>
            <small>{openSub(row.stageLabel, row.managerName, showOwner)}</small>
          </span>
          <span className="ml-amount">
            {rowValue(row.kind, row.value)}
            {row.managerName === null && (
              <Badge tone="attention">Χωρίς υπεύθυνο</Badge>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PipelineBody(props: ReportBodyProps & { data: SalesPipeline }) {
  const { data, report, filters, canExport } = props;
  if (data.totals.count === 0) {
    return (
      <StateNotice kind="empty" title="Καμία ανοιχτή Ευκαιρία">
        Δεν υπάρχουν ανοιχτές Ευκαιρίες.
      </StateNotice>
    );
  }
  const showOwner = data.showSeller && !filters.sellerId;
  return (
    <div className="m1s-body ml-stack">
      <NoAmountsNote amounts={data.amounts} />
      <Cards
        items={[
          { label: "Ανοιχτές Ευκαιρίες", value: String(data.totals.count) },
          { label: "Μηνιαία αξία", value: monthlyText(data.totals.monthly) },
          { label: "Εφάπαξ αξία", value: money(data.totals.oneOff) },
        ]}
      />
      <Section
        title="Στάδιο"
        hint={`${data.stages.length} στάδια · ${opportunitiesHint(data.totals.count)}`}
      >
        <div className="scroll">
          <table className="rtable m1s-table">
            <thead>
              <tr>
                <th>Στάδιο</th>
                <th className="num">Ευκαιρίες</th>
                <th className="num">Μηνιαία αξία</th>
                <th className="num">Εφάπαξ αξία</th>
                <th className="num">Χωρίς πρόταση</th>
              </tr>
            </thead>
            <tbody>
              {data.stages.map((s) => (
                <tr key={s.stageId}>
                  <td data-label="Στάδιο">
                    <Entity name={s.label} />
                  </td>
                  <td className="num" data-label="Ευκαιρίες">
                    {s.count}
                  </td>
                  <td className="num" data-label="Μηνιαία αξία">
                    {monthlyText(s.monthly)}
                  </td>
                  <td className="num" data-label="Εφάπαξ αξία">
                    {money(s.oneOff)}
                  </td>
                  <td className="num" data-label="Χωρίς πρόταση">
                    {s.withoutProposal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="Οι ανοιχτές Ευκαιρίες"
        hint={`${opportunitiesHint(data.rows.length)} · χωρίς υπεύθυνο με κόκκινη τελεία`}
      >
        <OpenList rows={data.rows} showOwner={showOwner} />
      </Section>
      {canExport && (
        <ExportRow family="sales" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
