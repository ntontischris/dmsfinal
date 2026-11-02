import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Entity, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, StateNotice } from "@/spaces/screens/shared";

import type { SalesOpenRow, SalesPipeline } from "../sales-schema";
import { money, monthlyText, openSub } from "./m1-adapter";
import { NoAmountsNote } from "./m1-finance-parts";
import { ExportRow } from "./m1-export-row";
import type { ReportBodyProps } from "./m1-model";
import { Cards, Section } from "./m1-sales-parts";

// Ανοιχτές Ευκαιρίες ανά Στάδιο (prototype `screens/m1-sales-pipeline.tsx`) πάνω στο report_sales_pipeline.
// Η βάση κρίνει Εύρος, Πωλητή και ποσά.

function OpenList({
  rows,
  showOwner,
}: {
  rows: readonly SalesOpenRow[];
  showOwner: boolean;
}) {
  return (
    <RowList>
      {rows.map((row) => (
        <ListRow
          key={row.opportunityId}
          title={`${row.title} · ${row.clientName}`}
          href={hrefOf("B4", { id: row.opportunityId })}
          sub={openSub(row.stageLabel, row.managerName, showOwner)}
          aside={
            row.managerName === null ? (
              <Badge tone="attention">Χωρίς υπεύθυνο</Badge>
            ) : undefined
          }
        />
      ))}
    </RowList>
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
    <div className="m1s-body">
      <NoAmountsNote amounts={data.amounts} />
      <Cards
        items={[
          { label: "Ανοιχτές Ευκαιρίες", value: String(data.totals.count) },
          { label: "Μηνιαία αξία", value: monthlyText(data.totals.monthly) },
          { label: "Εφάπαξ αξία", value: money(data.totals.oneOff) },
        ]}
      />
      <Panel label="Στάδιο" isFlush>
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
      </Panel>
      <Section title="Οι ανοιχτές Ευκαιρίες">
        <OpenList rows={data.rows} showOwner={showOwner} />
      </Section>
      {canExport && (
        <ExportRow family="sales" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
