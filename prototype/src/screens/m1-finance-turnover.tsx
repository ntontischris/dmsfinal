import type { TurnoverRow } from "@/data/reports-access";
import { findClient } from "@/data/sales";
import { fmtMonth } from "@/screens/i6-model";
import {
  Cell,
  ExportRow,
  SummaryCard,
  money,
} from "@/screens/m1-finance-parts";
import { Badge, StateNotice } from "@/screens/shared";

interface TurnoverProps {
  rows: readonly TurnoverRow[];
  clientId?: string;
  showAmounts: boolean;
  isEmpty: boolean;
  canExport: boolean;
}

const sum = (rows: readonly TurnoverRow[], pick: (r: TurnoverRow) => number) =>
  rows.reduce((s, r) => s + pick(r), 0);

const hasData = (rows: readonly TurnoverRow[]): boolean =>
  rows.some(
    (r) =>
      r.revenue !== 0 ||
      r.receipts !== 0 ||
      r.invoiceCount > 0 ||
      r.receiptCount > 0,
  );

function Chart({
  rows,
  show,
}: {
  rows: readonly TurnoverRow[];
  show: boolean;
}) {
  if (!show) return null;
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [Math.abs(r.revenue), r.receipts]),
  );
  const width = (v: number) => `${(Math.abs(v) / max) * 60}%`;
  return (
    <div className="m1f-chart" aria-hidden="true">
      {rows.map((r) => (
        <div key={r.month} className="m1f-month">
          <span>{fmtMonth(r.month)}</span>
          <div className="m1f-bar">
            <div className="m1f-fill" style={{ width: width(r.revenue) }} />
            <em>{money(r.revenue, true)}</em>
          </div>
          <div className="m1f-bar">
            <div
              className="m1f-fill"
              data-kind="receipts"
              style={{ width: width(r.receipts) }}
            />
            <em>{money(r.receipts, true)}</em>
          </div>
        </div>
      ))}
      <span className="m1f-legend">
        Πρώτη μπάρα: Τζίρος (χωρίς ΦΠΑ) · δεύτερη: Εισπράξεις (με ΦΠΑ)
      </span>
    </div>
  );
}

function Table({
  rows,
  show,
}: {
  rows: readonly TurnoverRow[];
  show: boolean;
}) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Μήνας</th>
          <th className="num">Τζίρος</th>
          <th className="num">Τιμολόγια</th>
          <th className="num">Εισπράξεις</th>
          <th className="num">Εισπράξεις (πλήθος)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.month}>
            <Cell label="Μήνας">
              {fmtMonth(r.month)} {r.isPartial && <Badge>ως σήμερα</Badge>}
            </Cell>
            <Cell label="Τζίρος" num>
              {money(r.revenue, show)}
            </Cell>
            <Cell label="Τιμολόγια" num>
              {r.invoiceCount}
            </Cell>
            <Cell label="Εισπράξεις" num>
              {money(r.receipts, show)}
            </Cell>
            <Cell label="Εισπράξεις (πλήθος)" num>
              {r.receiptCount}
            </Cell>
          </tr>
        ))}
        <tr className="m1f-total">
          <Cell label="Μήνας">Σύνολο</Cell>
          <Cell label="Τζίρος" num>
            {money(
              sum(rows, (r) => r.revenue),
              show,
            )}
          </Cell>
          <Cell label="Τιμολόγια" num>
            {sum(rows, (r) => r.invoiceCount)}
          </Cell>
          <Cell label="Εισπράξεις" num>
            {money(
              sum(rows, (r) => r.receipts),
              show,
            )}
          </Cell>
          <Cell label="Εισπράξεις (πλήθος)" num>
            {sum(rows, (r) => r.receiptCount)}
          </Cell>
        </tr>
      </tbody>
    </table>
  );
}

export function TurnoverBody(props: TurnoverProps) {
  const { rows, clientId, showAmounts, isEmpty, canExport } = props;
  if (isEmpty || !hasData(rows)) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν κινήσεις">
        Δεν υπάρχουν Τιμολόγια ούτε Εισπράξεις σε αυτή την περίοδο. Δοκίμασε
        άλλη περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1f-wrap">
      {clientId && (
        <p className="note">
          Μόνο για: {findClient(clientId)?.name ?? clientId}
        </p>
      )}
      <div className="m1f-cards">
        <SummaryCard
          label="Τζίρος περιόδου"
          basis="χωρίς ΦΠΑ"
          value={money(
            sum(rows, (r) => r.revenue),
            showAmounts,
          )}
        />
        <SummaryCard
          label="Εισπράξεις περιόδου"
          basis="με ΦΠΑ"
          value={money(
            sum(rows, (r) => r.receipts),
            showAmounts,
          )}
        />
      </div>
      <Chart rows={rows} show={showAmounts} />
      <Table rows={rows} show={showAmounts} />
      <ExportRow canExport={canExport} />
    </div>
  );
}
