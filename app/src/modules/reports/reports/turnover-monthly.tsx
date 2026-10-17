import type { ReactNode } from "react";

import { StatGrid } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { canSeeFinanceReports } from "../access";
import type { ReportBodyProps, ReportDefinition } from "../catalog/types";
import {
  PartialBadge,
  ReportEmpty,
  ReportError,
  ReportFrame,
  ReportNote,
} from "../components/report-parts";
import { ClientPicker } from "../components/client-picker";
import { TurnoverChart } from "../components/turnover-chart";
import { monthLabel, moneyOrDash } from "../format";
import { hasMovement } from "../helpers";
import { ONLY_FOR, TOTAL_LABEL } from "../labels";
import { getTurnoverMonthly } from "../queries";
import type { TurnoverMonth, TurnoverMonthly } from "../view-schema";

// Τζίρος και Εισπράξεις ανά μήνα (M1). Τζίρος χωρίς ΦΠΑ κατά έκδοση, Εισπράξεις με ΦΠΑ κατά είσπραξη: δίπλα δίπλα,
// ποτέ προστιθέμενα. Φίλτρα: Περίοδος, Πελάτης.

const TITLE = "Τζίρος και Εισπράξεις ανά μήνα";

const COLUMNS = {
  month: "Μήνας",
  turnover: "Τζίρος",
  invoices: "Τιμολόγια",
  collections: "Εισπράξεις",
  receipts: "Εισπράξεις (πλήθος)",
} as const;

function Line({
  label,
  row,
  isTotal,
}: {
  label: ReactNode;
  row: Omit<TurnoverMonth, "month" | "isPartial">;
  isTotal?: boolean;
}) {
  const strong = isTotal ? "font-semibold" : undefined;
  return (
    <Tr>
      <Td data-label={COLUMNS.month} className={strong}>
        {label}
      </Td>
      <Td data-label={COLUMNS.turnover} isNumeric className={strong}>
        {moneyOrDash(row.turnover)}
      </Td>
      <Td data-label={COLUMNS.invoices} isNumeric className={strong}>
        {row.invoiceCount}
        {row.creditCount > 0 && (
          <span className="text-muted-foreground">
            {" "}
            (+{row.creditCount} πιστ.)
          </span>
        )}
      </Td>
      <Td data-label={COLUMNS.collections} isNumeric className={strong}>
        {moneyOrDash(row.collections)}
      </Td>
      <Td data-label={COLUMNS.receipts} isNumeric className={strong}>
        {row.receiptCount}
      </Td>
    </Tr>
  );
}

function MonthsTable({ data }: { data: TurnoverMonthly }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.month}</Th>
          <Th isNumeric>{COLUMNS.turnover}</Th>
          <Th isNumeric>{COLUMNS.invoices}</Th>
          <Th isNumeric>{COLUMNS.collections}</Th>
          <Th isNumeric>{COLUMNS.receipts}</Th>
        </tr>
      </thead>
      <tbody>
        {data.months.map((m) => (
          <Line
            key={m.month}
            row={m}
            label={
              <span className="inline-flex flex-wrap items-center gap-2">
                {monthLabel(m.month)} <PartialBadge isPartial={m.isPartial} />
              </span>
            }
          />
        ))}
        <Line label={TOTAL_LABEL} row={data.totals} isTotal />
      </tbody>
    </Table>
  );
}

function TurnoverContent({ data, actions }: { data: TurnoverMonthly; actions: ReactNode }) {
  if (!hasMovement(data.months)) {
    return (
      <ReportEmpty title="Δεν υπάρχουν κινήσεις">
        Δεν υπάρχουν Τιμολόγια ούτε Εισπράξεις σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
      </ReportEmpty>
    );
  }
  return (
    <ReportFrame amounts={data.amounts} actions={actions}>
      {data.client && <ReportNote>{ONLY_FOR(data.client.name)}</ReportNote>}
      <StatGrid
        items={[
          {
            label: "Τζίρος περιόδου",
            value: moneyOrDash(data.totals.turnover),
            hint: "χωρίς ΦΠΑ, μετά τα Πιστωτικά",
          },
          {
            label: "Εισπράξεις περιόδου",
            value: moneyOrDash(data.totals.collections),
            hint: "με ΦΠΑ",
          },
        ]}
      />
      {data.amounts && <TurnoverChart months={data.months} />}
      <MonthsTable data={data} />
    </ReportFrame>
  );
}

async function TurnoverMonthlyBody({ report, filters, actions }: ReportBodyProps) {
  const result = await getTurnoverMonthly(filters.period, filters.clientId);
  if (!result.ok) return <ReportError title={TITLE} />;
  return (
    <div className="grid min-w-0 gap-4">
      {(result.data.clients.length > 1 || result.data.client) && (
        <ClientPicker
          reportId={report.id}
          period={filters.period}
          clients={result.data.clients}
          selected={result.data.client?.id}
        />
      )}
      <TurnoverContent data={result.data} actions={actions} />
    </div>
  );
}

export const TURNOVER_MONTHLY: ReportDefinition = {
  id: "turnover",
  family: "finance",
  title: TITLE,
  answers: "Πόσα τιμολογήσαμε και πόσα μπήκαν, κάθε μήνα.",
  basis:
    "Τζίρος: καθαρά ποσά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης. Εισπράξεις: ποσά με ΦΠΑ, κατά ημερομηνία είσπραξης. Δεν προστίθενται ούτε αφαιρούνται μεταξύ τους.",
  usesPeriod: true,
  isVisible: canSeeFinanceReports,
  Body: TurnoverMonthlyBody,
};
