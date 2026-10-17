import Link from "next/link";

import { Table, Td, Th, Tr } from "@/components/ui/table";

import { canSeeFinanceReports } from "../access";
import type { ReportBodyProps, ReportDefinition } from "../catalog/types";
import {
  ReportEmpty,
  ReportError,
  ReportFrame,
  ReportNote,
} from "../components/report-parts";
import { moneyOrDash, percentOrDash } from "../format";
import { TOTAL_LABEL } from "../labels";
import { getTurnoverByClient } from "../queries";
import { clientHref } from "../url";
import type { TurnoverByClient } from "../view-schema";

// Τζίρος ανά Πελάτη (M1): όπως ο Τζίρος, με μερίδιο στο σύνολο της περιόδου. Κάθε γραμμή ανοίγει τη Σελίδα Πελάτη.

const TITLE = "Τζίρος ανά Πελάτη";

const COLUMNS = {
  client: "Πελάτης",
  turnover: "Τζίρος",
  share: "Μερίδιο",
  invoices: "Τιμολόγια",
} as const;

function ClientsTable({ data }: { data: TurnoverByClient }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.client}</Th>
          <Th isNumeric>{COLUMNS.turnover}</Th>
          <Th isNumeric>{COLUMNS.share}</Th>
          <Th isNumeric>{COLUMNS.invoices}</Th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row) => (
          <Tr key={row.clientId}>
            <Td data-label={COLUMNS.client}>
              <Link href={clientHref(row.clientId)}>{row.clientName}</Link>
            </Td>
            <Td data-label={COLUMNS.turnover} isNumeric>
              {moneyOrDash(row.turnover)}
            </Td>
            <Td data-label={COLUMNS.share} isNumeric>
              {percentOrDash(row.share)}
            </Td>
            <Td data-label={COLUMNS.invoices} isNumeric>
              {row.invoiceCount}
            </Td>
          </Tr>
        ))}
        <Tr>
          <Td data-label={COLUMNS.client} className="font-semibold">
            {TOTAL_LABEL}
          </Td>
          <Td data-label={COLUMNS.turnover} isNumeric className="font-semibold">
            {moneyOrDash(data.totals.turnover)}
          </Td>
          <Td data-label={COLUMNS.share} isNumeric className="font-semibold">
            {percentOrDash(data.totals.turnover !== null && data.totals.turnover > 0 ? 1 : null)}
          </Td>
          <Td data-label={COLUMNS.invoices} isNumeric className="font-semibold">
            {data.totals.invoiceCount}
          </Td>
        </Tr>
      </tbody>
    </Table>
  );
}

async function TurnoverByClientBody({ filters, actions }: ReportBodyProps) {
  const result = await getTurnoverByClient(filters.period);
  if (!result.ok) return <ReportError title={TITLE} />;
  if (result.data.rows.length === 0) {
    return (
      <ReportEmpty title="Δεν υπάρχουν Τιμολόγια">
        Δεν υπάρχουν Τιμολόγια σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
      </ReportEmpty>
    );
  }
  return (
    <ReportFrame amounts={result.data.amounts} actions={actions}>
      <ClientsTable data={result.data} />
      <ReportNote>Τζίρος χωρίς ΦΠΑ, μετά τα Πιστωτικά.</ReportNote>
    </ReportFrame>
  );
}

export const TURNOVER_BY_CLIENT: ReportDefinition = {
  id: "by-client",
  family: "finance",
  title: TITLE,
  answers: "Από ποιους Πελάτες έρχεται ο Τζίρος της περιόδου.",
  basis:
    "Καθαρά ποσά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης, με μερίδιο στο σύνολο.",
  usesPeriod: true,
  isVisible: canSeeFinanceReports,
  Body: TurnoverByClientBody,
};
