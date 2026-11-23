import { StateNotice, fmtDate } from "@/spaces/screens/shared";

import type { ReceivablesAging, TurnoverByClient } from "../view-schema";
import { agingCell, money } from "./m1-adapter";
import { Box, Facts, countHint } from "./m1-box";
import {
  AGING_BUCKETS,
  ClientLines,
  ReceivableLines,
  percent,
} from "./m1-client-lines";
import { ExportRow } from "./m1-export-row";
import { NoAmountsNote } from "./m1-finance-parts";
import type { ReportBodyProps } from "./m1-model";

// Τζίρος ανά Πελάτη και Οφειλές κατά ηλικία (prototype `screens/m1-finance-clients.tsx`) πάνω στα report_turnover_by_client
// και report_receivables_aging. Χωρίς «Βλέπει ποσά» οι Οφειλές δείχνουν πλήθος Τιμολογίων ανά κουτί.

const CLIENTS = { one: "Πελάτης", many: "Πελάτες", none: "κανένας" };

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
    <div className="m1f-wrap ml-stack">
      <NoAmountsNote amounts={data.amounts} />
      <Facts
        items={[
          {
            label: "Τζίρος",
            basis: `χωρίς ΦΠΑ · μερίδιο ${percent(totalShare)}`,
            value: money(totals.turnover),
          },
          { label: "Πελάτες", value: String(rows.length) },
          { label: "Τιμολόγια", value: String(totals.invoiceCount) },
        ]}
      />
      <Box
        title="Πελάτες"
        hint={`${countHint(rows.length, CLIENTS)} · ${money(totals.turnover)}`}
      >
        <ClientLines rows={rows} />
      </Box>
      <p className="note">Τζίρος χωρίς ΦΠΑ, μετά τα Πιστωτικά.</p>
      {canExport && (
        <ExportRow family="finance" reportId={report.id} filters={filters} />
      )}
    </div>
  );
}

function AgeTotals({ data }: { data: ReceivablesAging }) {
  const { totals, amounts } = data;
  return (
    <Box title="Κατά ηλικία" hint="πόσα χρωστιούνται σε κάθε κουτί ηλικίας">
      <ul>
        {AGING_BUCKETS.map((label, i) => (
          <li key={label}>
            {label}:{" "}
            <strong>
              {agingCell(
                amounts,
                totals.buckets[i] ?? null,
                totals.counts[i] ?? 0,
              )}
            </strong>
          </li>
        ))}
        <li>
          Σύνολο:{" "}
          <strong>
            {amounts ? money(totals.total) : `${totals.invoiceCount} Τιμ.`}
          </strong>
        </li>
      </ul>
    </Box>
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
    <div className="m1f-wrap ml-stack">
      <NoAmountsNote amounts={amounts} />
      <Facts
        items={[
          {
            label: "Σύνολο ανεξόφλητων",
            basis: amounts ? "με ΦΠΑ" : "Τιμολόγια",
            value: amounts ? money(totals.total) : String(totals.invoiceCount),
          },
          {
            label: "Ληξιπρόθεσμα",
            basis: amounts ? "με ΦΠΑ" : "Τιμολόγια",
            value: amounts ? money(totals.overdue) : String(overdueCount),
          },
        ]}
      />
      <Box
        title="Πελάτες"
        hint={`${countHint(rows.length, CLIENTS)} χρωστούν · τα 61+ μέρες με κόκκινη τελεία`}
      >
        <ReceivableLines rows={rows} amounts={amounts} />
      </Box>
      <AgeTotals data={data} />
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
