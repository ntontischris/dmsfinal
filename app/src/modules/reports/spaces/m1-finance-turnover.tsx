import { Panel } from "@/spaces/kit/panel";
import { Badge, StateNotice } from "@/spaces/screens/shared";

import { monthLabel } from "../format";
import { hasMovement } from "../helpers";
import type { TurnoverMonth, TurnoverMonthly } from "../view-schema";
import { money, quietText, turnoverChartOf } from "./m1-adapter";
import { ExportRow } from "./m1-export-row";
import { Cell, NoAmountsNote, SummaryCard } from "./m1-finance-parts";
import type { ReportBodyProps } from "./m1-model";

// Τζίρος και Εισπράξεις ανά μήνα (prototype `screens/m1-finance-turnover.tsx`) πάνω στο report_turnover_monthly.
// Τζίρος χωρίς ΦΠΑ κατά έκδοση, Εισπράξεις με ΦΠΑ κατά είσπραξη: δίπλα δίπλα, ποτέ προστιθέμενα.

// Μήνες χωρίς κίνηση δεν πιάνουν χώρο. Μόνο με ποσά.
function Chart({ months }: { months: readonly TurnoverMonth[] }) {
  const { bars, quiet } = turnoverChartOf(months);
  return (
    <Panel label="Μήνες">
      <div className="m1f-chart" aria-hidden="true">
        <span className="m1f-legend">
          Πρώτη μπάρα: Τζίρος (χωρίς ΦΠΑ, κατά έκδοση) · δεύτερη: Εισπράξεις (με
          ΦΠΑ, κατά είσπραξη). Δεν προστίθενται μεταξύ τους.
        </span>
        {bars.map((r) => (
          <div key={r.month} className="m1f-month" data-current={r.isPartial}>
            <span>{monthLabel(r.month)}</span>
            <div className="m1f-bars">
              <div className="m1f-bar">
                <div className="m1f-fill" style={{ width: r.turnoverWidth }} />
                <em>Τζίρος {money(r.turnover)} χωρίς ΦΠΑ</em>
              </div>
              <div className="m1f-bar">
                <div
                  className="m1f-fill"
                  data-kind="receipts"
                  style={{ width: r.collectionsWidth }}
                />
                <em>Εισπράξεις {money(r.collections)} με ΦΠΑ</em>
              </div>
            </div>
          </div>
        ))}
        {quiet > 0 && <span className="m1f-legend">{quietText(quiet)}</span>}
      </div>
    </Panel>
  );
}

function Invoices({ count, credits }: { count: number; credits: number }) {
  return (
    <>
      {count}
      {credits > 0 && <span className="muted"> (+{credits} πιστ.)</span>}
    </>
  );
}

function Table({ data }: { data: TurnoverMonthly }) {
  const { totals } = data;
  return (
    <Panel label="Πίνακας" isFlush>
      <div className="scroll">
        <table className="rtable m1f-table">
          <thead>
            <tr>
              <th>Μήνας</th>
              <th className="num">Τζίρος (χωρίς ΦΠΑ)</th>
              <th className="num">Τιμολόγια</th>
              <th className="num">Εισπράξεις (με ΦΠΑ)</th>
              <th className="num">Εισπράξεις (πλήθος)</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((r) => (
              <tr key={r.month}>
                <Cell label="Μήνας">
                  <strong>{monthLabel(r.month)}</strong>{" "}
                  {r.isPartial && <Badge tone="strong">ως σήμερα</Badge>}
                </Cell>
                <Cell label="Τζίρος" num>
                  {money(r.turnover)}
                </Cell>
                <Cell label="Τιμολόγια" num>
                  <Invoices count={r.invoiceCount} credits={r.creditCount} />
                </Cell>
                <Cell label="Εισπράξεις" num>
                  {money(r.collections)}
                </Cell>
                <Cell label="Εισπράξεις (πλήθος)" num>
                  {r.receiptCount}
                </Cell>
              </tr>
            ))}
            <tr className="m1f-total">
              <Cell label="Μήνας">Σύνολο</Cell>
              <Cell label="Τζίρος" num>
                {money(totals.turnover)}
              </Cell>
              <Cell label="Τιμολόγια" num>
                <Invoices
                  count={totals.invoiceCount}
                  credits={totals.creditCount}
                />
              </Cell>
              <Cell label="Εισπράξεις" num>
                {money(totals.collections)}
              </Cell>
              <Cell label="Εισπράξεις (πλήθος)" num>
                {totals.receiptCount}
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function TurnoverBody(
  props: ReportBodyProps & { data: TurnoverMonthly },
) {
  const { data, report, filters, canExport } = props;
  if (!hasMovement(data.months)) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν κινήσεις">
        Δεν υπάρχουν Τιμολόγια ούτε Εισπράξεις σε αυτή την περίοδο. Δοκίμασε
        άλλη περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1f-wrap">
      <NoAmountsNote amounts={data.amounts} />
      {data.client && <p className="note">Μόνο για: {data.client.name}</p>}
      <div className="m1f-cards">
        <SummaryCard
          label="Τζίρος περιόδου"
          basis="χωρίς ΦΠΑ"
          value={money(data.totals.turnover)}
        />
        <SummaryCard
          label="Εισπράξεις περιόδου"
          basis="με ΦΠΑ"
          value={money(data.totals.collections)}
        />
      </div>
      {data.amounts && <Chart months={data.months} />}
      <Table data={data} />
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
