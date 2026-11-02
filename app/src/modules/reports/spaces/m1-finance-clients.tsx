import { Panel } from "@/spaces/kit/panel";
import { Entity } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import {
  Badge,
  StateNotice,
  fmtDate,
  fmtPercent,
} from "@/spaces/screens/shared";

import type {
  AgingRow,
  ReceivablesAging,
  TurnoverByClient,
} from "../view-schema";
import { agingCell, money, shareWidth } from "./m1-adapter";
import { ExportRow } from "./m1-export-row";
import { Cell, NoAmountsNote, SummaryCard } from "./m1-finance-parts";
import type { ReportBodyProps } from "./m1-model";

// Τζίρος ανά Πελάτη και Οφειλές κατά ηλικία (prototype `screens/m1-finance-clients.tsx`) πάνω στα report_turnover_by_client
// και report_receivables_aging. Χωρίς «Βλέπει ποσά» οι Οφειλές δείχνουν πλήθος Τιμολογίων ανά κουτί.

const AGING_BUCKETS = [
  "Δεν έχει λήξει",
  "1–30 μέρες",
  "31–60 μέρες",
  "61–90 μέρες",
  "Πάνω από 90",
] as const;

const percent = (value: number | null): string =>
  value === null ? "—" : fmtPercent(value);

export function ByClientBody(
  props: ReportBodyProps & { data: TurnoverByClient },
) {
  const { data, report, filters, canExport } = props;
  const { rows, totals } = data;
  if (rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Τιμολόγια">
        Δεν υπάρχουν Τιμολόγια σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
      </StateNotice>
    );
  }
  const totalShare = totals.turnover !== null && totals.turnover > 0 ? 1 : null;
  return (
    <div className="m1f-wrap">
      <NoAmountsNote amounts={data.amounts} />
      <Panel label="Πελάτες" isFlush>
        <div className="scroll">
          <table className="rtable m1f-table">
            <thead>
              <tr>
                <th>Πελάτης</th>
                <th className="num">Τζίρος</th>
                <th className="num">Μερίδιο</th>
                <th className="num">Τιμολόγια</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clientId}>
                  <Cell label="Πελάτης">
                    <Entity
                      name={r.clientName}
                      href={hrefOf("B2", { id: r.clientId })}
                    />
                  </Cell>
                  <Cell label="Τζίρος" num>
                    {money(r.turnover)}
                  </Cell>
                  <Cell label="Μερίδιο" num>
                    {percent(r.share)}
                    {r.share !== null && (
                      <span className="m1f-share" aria-hidden="true">
                        <span style={{ width: shareWidth(r.share) }} />
                      </span>
                    )}
                  </Cell>
                  <Cell label="Τιμολόγια" num>
                    {r.invoiceCount}
                  </Cell>
                </tr>
              ))}
              <tr className="m1f-total">
                <Cell label="Πελάτης">Σύνολο</Cell>
                <Cell label="Τζίρος" num>
                  {money(totals.turnover)}
                </Cell>
                <Cell label="Μερίδιο" num>
                  {percent(totalShare)}
                </Cell>
                <Cell label="Τιμολόγια" num>
                  {totals.invoiceCount}
                </Cell>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="note">Τζίρος χωρίς ΦΠΑ, μετά τα Πιστωτικά.</p>
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}

// Η Καρτέλα θέλει «Βλέπει ποσά»· χωρίς αυτό η γραμμή ανοίγει τη Σελίδα Πελάτη.
function ReceivableLine({ r, amounts }: { r: AgingRow; amounts: boolean }) {
  return (
    <tr>
      <Cell label="Πελάτης">
        <Entity
          name={r.clientName}
          href={
            amounts
              ? hrefOf("I5", { client: r.clientId })
              : hrefOf("B2", { id: r.clientId })
          }
          sub={
            r.oldestDue ? `παλαιότερη λήξη ${fmtDate(r.oldestDue)}` : undefined
          }
        />
      </Cell>
      {AGING_BUCKETS.map((label, i) => (
        <Cell key={label} label={label} num>
          {agingCell(amounts, r.buckets[i] ?? null, r.counts[i] ?? 0)}{" "}
          {i >= 3 && (r.counts[i] ?? 0) > 0 && (
            <Badge tone="attention">61+ μέρες</Badge>
          )}
        </Cell>
      ))}
      <Cell label="Σύνολο" num>
        {amounts ? money(r.total) : `${r.invoiceCount} Τιμ.`}
      </Cell>
    </tr>
  );
}

export function ReceivablesBody(
  props: ReportBodyProps & { data: ReceivablesAging },
) {
  const { data, report, filters, canExport } = props;
  const { rows, totals, amounts } = data;
  if (rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν οφειλές">
        Κανείς δεν χρωστά σήμερα.
      </StateNotice>
    );
  }
  const overdueCount = totals.invoiceCount - (totals.counts[0] ?? 0);
  return (
    <div className="m1f-wrap">
      <NoAmountsNote amounts={amounts} />
      <div className="m1f-cards">
        <SummaryCard
          label="Σύνολο ανεξόφλητων"
          basis={amounts ? "με ΦΠΑ" : "Τιμολόγια"}
          value={amounts ? money(totals.total) : String(totals.invoiceCount)}
        />
        <SummaryCard
          label="Ληξιπρόθεσμα"
          basis={amounts ? "με ΦΠΑ" : "Τιμολόγια"}
          value={amounts ? money(totals.overdue) : String(overdueCount)}
        />
      </div>
      <Panel label="Πελάτες" isFlush>
        <div className="scroll">
          <table className="rtable m1f-table">
            <thead>
              <tr>
                <th>Πελάτης</th>
                {AGING_BUCKETS.map((b) => (
                  <th key={b} className="num">
                    {b}
                  </th>
                ))}
                <th className="num">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ReceivableLine key={r.clientId} r={r} amounts={amounts} />
              ))}
              <tr className="m1f-total">
                <Cell label="Πελάτης">Σύνολο</Cell>
                {AGING_BUCKETS.map((b, i) => (
                  <Cell key={b} label={b} num>
                    {agingCell(
                      amounts,
                      totals.buckets[i] ?? null,
                      totals.counts[i] ?? 0,
                    )}
                  </Cell>
                ))}
                <Cell label="Σύνολο" num>
                  {amounts
                    ? money(totals.total)
                    : `${totals.invoiceCount} Τιμ.`}
                </Cell>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="note">
        Ποσά Τιμολογίων με ΦΠΑ, όπως τα χρωστά ο Πελάτης, σήμερα{" "}
        {fmtDate(data.today)}. Υπόλοιπο υπέρ του πελάτη δεν μετρά εδώ· φαίνεται
        στην Καρτέλα.
      </p>
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}
