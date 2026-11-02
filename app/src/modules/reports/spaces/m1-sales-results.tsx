import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Entity, Person } from "@/spaces/kit/parts";
import {
  Badge,
  StateNotice,
  fmtDate,
  fmtPercent,
} from "@/spaces/screens/shared";

import type {
  SalesClosedRow,
  SalesResults,
  SalesSources,
} from "../sales-schema";
import { money, monthlyText } from "./m1-adapter";
import { NoAmountsNote } from "./m1-finance-parts";
import { ExportRow } from "./m1-export-row";
import type { ReportBodyProps } from "./m1-model";
import { Cards, Section, rowValue } from "./m1-sales-parts";

// Κερδισμένες και χαμένες, Πηγές Ευκαιριών (prototype `screens/m1-sales-results.tsx`) πάνω στα report_sales_results και
// report_sales_sources. Ποσοστά από τη βάση.

const OUTCOME = {
  open: "Ανοιχτή",
  won: "Κερδισμένη",
  lost: "Χαμένη",
} as const;

const percent = (value: number | null): string =>
  value === null ? "—" : fmtPercent(value);

const wonHint = (data: SalesResults): string | undefined =>
  data.amounts
    ? `${monthlyText(data.totals.wonMonthly)} · ${money(data.totals.wonOneOff)} εφάπαξ`
    : undefined;

function ClosedTable({
  rows,
  showOwner,
}: {
  rows: readonly SalesClosedRow[];
  showOwner: boolean;
}) {
  return (
    <div className="scroll">
      <table className="rtable m1s-table">
        <thead>
          <tr>
            <th>Ευκαιρία</th>
            <th>Έκβαση</th>
            <th>Ημερομηνία Έκβασης</th>
            <th className="num">Αξία</th>
            {showOwner && <th>Υπεύθυνος</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.opportunityId}>
              <td data-label="Ευκαιρία">
                <Entity
                  name={r.title}
                  sub={r.clientName}
                  href={hrefOf("B4", { id: r.opportunityId })}
                />
              </td>
              <td data-label="Έκβαση">
                <Badge tone={r.outcome === "won" ? "strong" : "attention"}>
                  {OUTCOME[r.outcome]}
                </Badge>
                {r.outcome === "lost" && r.lossReason && ` ${r.lossReason}`}
              </td>
              <td data-label="Ημερομηνία Έκβασης">{fmtDate(r.closedOn)}</td>
              <td className="num m1s-money" data-label="Αξία">
                {rowValue(r.kind, r.value)}
              </td>
              {showOwner && (
                <td data-label="Υπεύθυνος">
                  <Person name={r.managerName ?? "Χωρίς υπεύθυνο"} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsBody(props: ReportBodyProps & { data: SalesResults }) {
  const { data, report, filters, canExport } = props;
  if (data.rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Καμία έκβαση στην περίοδο">
        Δεν έκλεισε καμία Ευκαιρία σε αυτή την περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1s-body">
      <NoAmountsNote amounts={data.amounts} />
      <Cards
        items={[
          {
            label: "Κερδισμένες",
            value: String(data.totals.won),
            hint: wonHint(data),
          },
          { label: "Χαμένες", value: String(data.totals.lost) },
          { label: "Ποσοστό επιτυχίας", value: percent(data.totals.winRate) },
        ]}
      />
      {data.lossReasons.length > 0 && (
        <Section title="Λόγοι απώλειας">
          <div className="scroll">
            <table className="rtable m1s-table">
              <thead>
                <tr>
                  <th>Λόγος</th>
                  <th className="num">Ευκαιρίες</th>
                </tr>
              </thead>
              <tbody>
                {data.lossReasons.map((l) => (
                  <tr key={l.reasonId}>
                    <td data-label="Λόγος">{l.label}</td>
                    <td className="num" data-label="Ευκαιρίες">
                      {l.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      <Section title="Οι Ευκαιρίες που έκλεισαν">
        <ClosedTable rows={data.rows} showOwner={data.showSeller} />
      </Section>
      {canExport && (
        <ExportRow family="sales" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}

// Οι Ευκαιρίες της περιόδου με την Έκβασή τους σήμερα, όπως η σημερινή σελίδα.
function SourcesOpportunities({ data }: { data: SalesSources }) {
  return (
    <div className="scroll">
      <table className="rtable m1s-table">
        <thead>
          <tr>
            <th>Ευκαιρία</th>
            <th>Πηγή</th>
            <th>Άνοιξε</th>
            <th>Σήμερα</th>
            {data.showSeller && <th>Υπεύθυνος</th>}
          </tr>
        </thead>
        <tbody>
          {data.opportunities.map((r) => (
            <tr key={r.opportunityId}>
              <td data-label="Ευκαιρία">
                <Entity
                  name={r.title}
                  sub={r.clientName}
                  href={hrefOf("B4", { id: r.opportunityId })}
                />
              </td>
              <td data-label="Πηγή">{r.sourceLabel}</td>
              <td data-label="Άνοιξε">{fmtDate(r.createdOn)}</td>
              <td data-label="Σήμερα">
                <Badge tone={r.outcome === "won" ? "strong" : undefined}>
                  {OUTCOME[r.outcome]}
                </Badge>
              </td>
              {data.showSeller && (
                <td data-label="Υπεύθυνος">
                  <Person name={r.managerName ?? "Χωρίς υπεύθυνο"} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SourcesBody(props: ReportBodyProps & { data: SalesSources }) {
  const { data, report, filters, canExport } = props;
  if (data.totals.opened === 0) {
    return (
      <StateNotice kind="empty" title="Καμία νέα Ευκαιρία">
        Δεν άνοιξε καμία Ευκαιρία σε αυτή την περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1s-body">
      <p className="note">Μετρά τις Ευκαιρίες που άνοιξαν μέσα στην περίοδο.</p>
      <Panel label="Πηγή" isFlush>
        <div className="scroll">
          <table className="rtable m1s-table">
            <thead>
              <tr>
                <th>Πηγή</th>
                <th className="num">Άνοιξαν</th>
                <th className="num">Κερδήθηκαν</th>
                <th className="num">Χάθηκαν</th>
                <th className="num">Ακόμα ανοιχτές</th>
                <th className="num">Ποσοστό επιτυχίας</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.sourceId}>
                  <td data-label="Πηγή">
                    <Entity name={r.label} />
                  </td>
                  <td className="num" data-label="Άνοιξαν">
                    {r.opened}
                  </td>
                  <td className="num" data-label="Κερδήθηκαν">
                    {r.won}
                  </td>
                  <td className="num" data-label="Χάθηκαν">
                    {r.lost}
                  </td>
                  <td className="num" data-label="Ακόμα ανοιχτές">
                    {r.open}
                  </td>
                  <td className="num" data-label="Ποσοστό επιτυχίας">
                    {percent(r.winRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Section title="Οι Ευκαιρίες της περιόδου">
        <SourcesOpportunities data={data} />
      </Section>
      {canExport && (
        <ExportRow family="sales" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
