import { Panel } from "@/spaces/kit/panel";
import { Badge, StateNotice, fmtPercent } from "@/spaces/screens/shared";

import { monthLabel } from "../format";
import { PARTIAL_BADGE } from "../labels";
import type { ExpensesByCategory, ProfitReport } from "../money-schema";
import { DASH, money, shareWidth } from "./m1-adapter";
import { ExportRow } from "./m1-export-row";
import { Cell, SummaryCard } from "./m1-finance-parts";
import type { ReportBodyProps } from "./m1-model";

// Έξοδα ανά κατηγορία και Έσοδα − Έξοδα = Κέρδος (d8, οι Αναφορές του παλιού DMS) πάνω στα report_expenses_by_category
// και report_profit. Τα Έξοδα έρχονται από το Κόστος· μήνας χωρίς Έξοδα το λέει, δεν μετρά ως μηδέν.

const percent = (value: number | null): string =>
  value === null ? DASH : fmtPercent(value);

const monthsText = (count: number): string =>
  count === 1 ? "1 μήνας" : `${count} μήνες`;

function ExpensesNotes({ data }: { data: ExpensesByCategory }) {
  return (
    <>
      {data.missingMonths > 0 && (
        <p className="note">
          {monthsText(data.missingMonths)} της περιόδου χωρίς Έξοδα στο Κόστος:
          δεν μετράνε εδώ.
        </p>
      )}
      {data.unsplitMonths > 0 && (
        <p className="note">
          {monthsText(data.unsplitMonths)} με σύνολο χωρίς ανάλυση: μετράνε στο
          «Χωρίς ανάλυση».
        </p>
      )}
    </>
  );
}

function ExpensesTable({ data }: { data: ExpensesByCategory }) {
  return (
    <Panel label="Κατηγορίες" isFlush>
      <div className="scroll">
        <table className="rtable m1f-table">
          <thead>
            <tr>
              <th>Κατηγορία</th>
              <th className="num">Έξοδα</th>
              <th className="num">Μερίδιο</th>
              <th className="num">Γραμμές</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.category}>
                <Cell label="Κατηγορία">{r.category}</Cell>
                <Cell label="Έξοδα" num>
                  {money(r.amount)}
                </Cell>
                <Cell label="Μερίδιο" num>
                  {percent(r.share)}
                  {r.share !== null && (
                    <span className="m1f-share" aria-hidden="true">
                      <span style={{ width: shareWidth(r.share) }} />
                    </span>
                  )}
                </Cell>
                <Cell label="Γραμμές" num>
                  {r.lineCount}
                </Cell>
              </tr>
            ))}
            <tr className="m1f-total">
              <Cell label="Κατηγορία">Σύνολο</Cell>
              <Cell label="Έξοδα" num>
                {money(data.totals.amount)}
              </Cell>
              <Cell label="Μερίδιο" num>
                {percent(data.totals.amount > 0 ? 1 : null)}
              </Cell>
              <Cell label="Γραμμές" num>
                {data.totals.lineCount}
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ExpensesBody(
  props: ReportBodyProps & { data: ExpensesByCategory },
) {
  const { data, report, filters, canExport } = props;
  if (data.rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Έξοδα">
        Δεν γράφτηκαν Έξοδα στο Κόστος για αυτή την περίοδο. Δοκίμασε άλλη
        περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1f-wrap">
      <ExpensesTable data={data} />
      <ExpensesNotes data={data} />
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}

function ProfitTable({ data }: { data: ProfitReport }) {
  return (
    <Panel label="Μήνες" isFlush>
      <div className="scroll">
        <table className="rtable m1f-table">
          <thead>
            <tr>
              <th>Μήνας</th>
              <th className="num">Έσοδα</th>
              <th className="num">Έξοδα</th>
              <th className="num">Κέρδος</th>
              <th className="num">Περιθώριο</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((m) => (
              <tr key={m.month}>
                <Cell label="Μήνας">
                  <strong>{monthLabel(m.month)}</strong>{" "}
                  {m.isPartial && <Badge tone="strong">{PARTIAL_BADGE}</Badge>}
                </Cell>
                <Cell label="Έσοδα" num>
                  {money(m.income)}
                </Cell>
                <Cell label="Έξοδα" num>
                  {m.expenses === null ? "χωρίς Έξοδα" : money(m.expenses)}
                </Cell>
                <Cell label="Κέρδος" num>
                  {money(m.profit)}
                </Cell>
                <Cell label="Περιθώριο" num>
                  {percent(m.margin)}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ProfitBody(props: ReportBodyProps & { data: ProfitReport }) {
  const { data, report, filters, canExport } = props;
  return (
    <div className="m1f-wrap">
      <div className="m1f-cards">
        <SummaryCard
          label="Κέρδος"
          basis="χωρίς ΦΠΑ"
          value={money(data.totals.profit)}
        />
        <SummaryCard
          label="Περιθώριο"
          basis="Κέρδος / Έσοδα"
          value={percent(data.totals.margin)}
        />
      </div>
      <ProfitTable data={data} />
      {data.missingMonths > 0 && (
        <p className="note">
          {monthsText(data.missingMonths)} χωρίς Έξοδα στο Κόστος: δεν έχουν
          Κέρδος και δεν μετράνε στα σύνολα.
        </p>
      )}
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
