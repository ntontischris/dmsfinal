import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StatGrid } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { canSeeFinanceReports } from "../access";
import type { ReportBodyProps, ReportDefinition } from "../catalog/types";
import {
  ReportEmpty,
  ReportError,
  ReportFrame,
  ReportNote,
} from "../components/report-parts";
import { dateLabel, moneyOrDash } from "../format";
import { TOTAL_LABEL } from "../labels";
import { getReceivablesAging } from "../queries";
import { clientHref, ledgerHref } from "../url";
import type { AgingRow, ReceivablesAging } from "../view-schema";

// Οφειλές κατά ηλικία (M1): το ανεξόφλητο (με ΦΠΑ) σήμερα, σε κουτιά από τη λήξη. Χωρίς Περίοδο. Κάθε γραμμή ανοίγει
// την Καρτέλα Πελάτη. Το «υπόλοιπο υπέρ του πελάτη» δεν μετρά. Χωρίς ποσά φαίνεται το πλήθος Τιμολογίων ανά κουτί.

const TITLE = "Οφειλές κατά ηλικία";
const BUCKETS = [
  "Δεν έχει λήξει",
  "1–30 μέρες",
  "31–60 μέρες",
  "61–90 μέρες",
  "Πάνω από 90",
] as const;
const CLIENT_COLUMN = "Πελάτης";

const cellOf = (
  amounts: boolean,
  amount: number | null,
  count: number,
): string =>
  amounts
    ? count === 0
      ? "—"
      : moneyOrDash(amount)
    : count === 0
      ? "—"
      : `${count} Τιμ.`;

function AgingLine({ row, amounts }: { row: AgingRow; amounts: boolean }) {
  return (
    <Tr>
      <Td data-label={CLIENT_COLUMN}>
        {/* Η Καρτέλα θέλει «Βλέπει ποσά»· χωρίς αυτό η γραμμή ανοίγει τη Σελίδα Πελάτη. */}
        <Link href={amounts ? ledgerHref(row.clientId) : clientHref(row.clientId)}>{row.clientName}</Link>
        {row.oldestDue && (
          <span className="block text-sm text-muted-foreground">
            παλαιότερη λήξη {dateLabel(row.oldestDue)}
          </span>
        )}
      </Td>
      {BUCKETS.map((label, index) => (
        <Td key={label} data-label={label} isNumeric>
          {cellOf(amounts, row.buckets[index] ?? null, row.counts[index] ?? 0)}{" "}
          {index >= 3 && (row.counts[index] ?? 0) > 0 && (
            <Badge tone="attention">61+ μέρες</Badge>
          )}
        </Td>
      ))}
      <Td data-label={TOTAL_LABEL} isNumeric>
        {amounts ? moneyOrDash(row.total) : `${row.invoiceCount} Τιμ.`}
      </Td>
    </Tr>
  );
}

function AgingTable({ data }: { data: ReceivablesAging }) {
  const { totals, amounts } = data;
  return (
    <Table>
      <thead>
        <tr>
          <Th>{CLIENT_COLUMN}</Th>
          {BUCKETS.map((label) => (
            <Th key={label} isNumeric>
              {label}
            </Th>
          ))}
          <Th isNumeric>{TOTAL_LABEL}</Th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row) => (
          <AgingLine key={row.clientId} row={row} amounts={amounts} />
        ))}
        <Tr>
          <Td data-label={CLIENT_COLUMN} className="font-semibold">
            {TOTAL_LABEL}
          </Td>
          {BUCKETS.map((label, index) => (
            <Td
              key={label}
              data-label={label}
              isNumeric
              className="font-semibold"
            >
              {cellOf(
                amounts,
                totals.buckets[index] ?? null,
                totals.counts[index] ?? 0,
              )}
            </Td>
          ))}
          <Td data-label={TOTAL_LABEL} isNumeric className="font-semibold">
            {amounts
              ? moneyOrDash(totals.total)
              : `${totals.invoiceCount} Τιμ.`}
          </Td>
        </Tr>
      </tbody>
    </Table>
  );
}

async function ReceivablesAgingBody({ actions }: ReportBodyProps) {
  const result = await getReceivablesAging();
  if (!result.ok) return <ReportError title={TITLE} />;
  const data = result.data;
  if (data.rows.length === 0) {
    return (
      <ReportEmpty title="Δεν υπάρχουν οφειλές">
        Κανείς δεν χρωστά σήμερα.
      </ReportEmpty>
    );
  }
  const overdueCount = data.totals.invoiceCount - (data.totals.counts[0] ?? 0);
  return (
    <ReportFrame amounts={data.amounts} actions={actions}>
      <StatGrid
        items={[
          {
            label: "Σύνολο ανεξόφλητων",
            value: data.amounts
              ? moneyOrDash(data.totals.total)
              : String(data.totals.invoiceCount),
            hint: data.amounts ? "με ΦΠΑ" : "Τιμολόγια",
          },
          {
            label: "Ληξιπρόθεσμα",
            value: data.amounts
              ? moneyOrDash(data.totals.overdue)
              : String(overdueCount),
            hint: data.amounts ? "με ΦΠΑ" : "Τιμολόγια",
            tone: overdueCount > 0 ? "attention" : undefined,
          },
        ]}
      />
      <AgingTable data={data} />
      <ReportNote>
        Ποσά με ΦΠΑ, όπως τα χρωστά ο Πελάτης, σήμερα {dateLabel(data.today)}.
        Υπόλοιπο υπέρ του πελάτη δεν μετρά εδώ· φαίνεται στην Καρτέλα.
      </ReportNote>
    </ReportFrame>
  );
}

export const RECEIVABLES_AGING: ReportDefinition = {
  id: "receivables",
  family: "finance",
  title: TITLE,
  answers: "Ποιος χρωστά, πόσα, και πόσο καιρό είναι ληξιπρόθεσμα.",
  basis:
    "Το ανεξόφλητο υπόλοιπο κάθε Τιμολογίου (με ΦΠΑ) σήμερα, σε κουτιά από την ημερομηνία λήξης. Δεν έχει περίοδο: δείχνει πάντα τη σημερινή εικόνα.",
  usesPeriod: false,
  isVisible: canSeeFinanceReports,
  Body: ReceivablesAgingBody,
};
