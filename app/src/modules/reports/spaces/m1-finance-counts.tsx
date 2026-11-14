import { Panel } from "@/spaces/kit/panel";
import { Badge, StateNotice, fmtPercent } from "@/spaces/screens/shared";

import type { PaymentMethodsReport, ProductionsReport } from "../money-schema";
import { PRODUCTION_TYPE_LABELS } from "../reports/productions";
import { DASH, money } from "./m1-adapter";
import { ExportRow } from "./m1-export-row";
import { Cell, NoAmountsNote, SummaryCard } from "./m1-finance-parts";
import type { ReportBodyProps } from "./m1-model";

// Τρόποι πληρωμής και Παραγωγές ανά κατάσταση (d8, οι Αναφορές του παλιού DMS) πάνω στα report_payment_methods και
// report_productions. Οι Τρόποι έρχονται από τις Ρυθμίσεις· ο αποσυρμένος φαίνεται όσο έχει Εισπράξεις.

const percent = (value: number | null): string =>
  value === null ? DASH : fmtPercent(value);

function MethodsTable({ data }: { data: PaymentMethodsReport }) {
  const { totals } = data;
  return (
    <Panel label="Τρόποι πληρωμής" isFlush>
      <div className="scroll">
        <table className="rtable m1f-table">
          <thead>
            <tr>
              <th>Τρόπος</th>
              <th className="num">Εισπράχθηκαν</th>
              <th className="num">Μερίδιο</th>
              <th className="num">Εισπράξεις</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.methodId}>
                <Cell label="Τρόπος">
                  {r.label}{" "}
                  {r.retired && <Badge tone="faded">αποσύρθηκε</Badge>}
                </Cell>
                <Cell label="Εισπράχθηκαν" num>
                  {money(r.amount)}
                </Cell>
                <Cell label="Μερίδιο" num>
                  {percent(r.share)}
                </Cell>
                <Cell label="Εισπράξεις" num>
                  {r.receiptCount}
                </Cell>
              </tr>
            ))}
            <tr className="m1f-total">
              <Cell label="Τρόπος">Σύνολο</Cell>
              <Cell label="Εισπράχθηκαν" num>
                {money(totals.amount)}
              </Cell>
              <Cell label="Μερίδιο" num>
                {percent(data.amounts ? 1 : null)}
              </Cell>
              <Cell label="Εισπράξεις" num>
                {totals.receiptCount}
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const withheldText = (data: PaymentMethodsReport): string =>
  data.totals.withheldCount === 0
    ? ""
    : ` Επιπλέον παρακρατήθηκαν ${money(data.totals.withheld)} σε ${data.totals.withheldCount} Εισπράξεις· δεν μετράνε στους Τρόπους.`;

export function PaymentMethodsBody(
  props: ReportBodyProps & { data: PaymentMethodsReport },
) {
  const { data, report, filters, canExport } = props;
  if (data.rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Εισπράξεις">
        Δεν καταχωρήθηκαν Εισπράξεις σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1f-wrap">
      <NoAmountsNote amounts={data.amounts} />
      <MethodsTable data={data} />
      <p className="note">
        Ποσά Εισπράξεων με ΦΠΑ, κατά ημερομηνία είσπραξης.{withheldText(data)}
      </p>
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}

const TOTAL_ROW = "";

function ProductionsTable({ data }: { data: ProductionsReport }) {
  const lines = [...data.rows, { ...data.totals, type: TOTAL_ROW }];
  return (
    <Panel label="Είδη" isFlush>
      <div className="scroll">
        <table className="rtable m1f-table">
          <thead>
            <tr>
              <th>Είδος</th>
              <th className="num">Ανοιχτές</th>
              <th className="num">Παραδόθηκαν</th>
              <th className="num">Ακυρώθηκαν</th>
              <th className="num">Σύνολο</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((r) => (
              <tr
                key={r.type || "total"}
                className={r.type === TOTAL_ROW ? "m1f-total" : undefined}
              >
                <Cell label="Είδος">
                  {r.type === TOTAL_ROW
                    ? "Σύνολο"
                    : (PRODUCTION_TYPE_LABELS[r.type] ?? r.type)}
                </Cell>
                <Cell label="Ανοιχτές" num>
                  {r.open}
                </Cell>
                <Cell label="Παραδόθηκαν" num>
                  {r.delivered}
                </Cell>
                <Cell label="Ακυρώθηκαν" num>
                  {r.cancelled}
                </Cell>
                <Cell label="Σύνολο" num>
                  {r.total}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ProductionsBody(
  props: ReportBodyProps & { data: ProductionsReport },
) {
  const { data, report, filters, canExport } = props;
  if (data.totals.total === 0 && data.deliveredInPeriod === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Παραγωγές">
        Καμία Παραγωγή δεν ξεκίνησε σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1f-wrap">
      <div className="m1f-cards">
        <SummaryCard
          label="Ξεκίνησαν"
          basis="στην περίοδο"
          value={String(data.totals.total)}
        />
        <SummaryCard
          label="Παραδόθηκαν"
          basis="στην περίοδο"
          value={String(data.deliveredInPeriod)}
        />
      </div>
      <ProductionsTable data={data} />
      <p className="note">
        Η κατάσταση είναι η σημερινή. Το «Παραδόθηκαν στην περίοδο» μετρά και
        Παραγωγές που ξεκίνησαν νωρίτερα.
      </p>
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
