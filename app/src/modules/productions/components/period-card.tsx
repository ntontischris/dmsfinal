import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";

import { balanceRows, periodLabel, type BalanceRow } from "../helpers";
import { PERIOD_STATE_LABELS } from "../labels";
import type { PeriodBalance, ProductionPeriod } from "../types";

import { MutedNote } from "./form-fields";

interface PeriodCardProps {
  period: ProductionPeriod | null;
  balances: readonly PeriodBalance[];
}

const NO_PERIOD_NOTE = "Εφάπαξ Συμφωνία ή Εσωτερική Παραγωγή: καμία Περίοδος.";
const NO_BALANCE_NOTE = "Η Περίοδος δεν έχει Παροχές.";

// Η Περίοδος της Παραγωγής και το υπόλοιπο ανά είδος Παροχής. Μετρά πλήθος, ποτέ ποσά.
export function PeriodCard({ period, balances }: PeriodCardProps) {
  if (!period)
    return (
      <Panel label="Περίοδος">
        <MutedNote>{NO_PERIOD_NOTE}</MutedNote>
      </Panel>
    );
  const rows = balanceRows(balances);
  return (
    <Panel label="Περίοδος">
      <div className="grid gap-4">
        <p className="m-0 text-sm">
          <span className="font-medium">{periodLabel(period.starts)}</span>
          <span className="ml-2 text-muted-foreground">
            {PERIOD_STATE_LABELS[period.state]}
          </span>
        </p>
        {rows.length === 0 ? (
          <MutedNote>{NO_BALANCE_NOTE}</MutedNote>
        ) : (
          <BalanceTable rows={rows} />
        )}
      </div>
    </Panel>
  );
}

function BalanceTable({ rows }: { rows: readonly BalanceRow[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Είδος Παροχής</Th>
          <Th isNumeric>δόθηκαν</Th>
          <Th isNumeric>μεταφέρθηκαν</Th>
          <Th isNumeric>καταναλώθηκαν</Th>
          <Th isNumeric>δεσμεύτηκαν</Th>
          <Th isNumeric>υπόλοιπο</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.kindId}>
            <Td data-label="Είδος Παροχής" className={cn(row.isEmpty && "text-muted-foreground")}>
              {row.label}
            </Td>
            <Td data-label="δόθηκαν" isNumeric>{row.given}</Td>
            <Td data-label="μεταφέρθηκαν" isNumeric>{row.carried}</Td>
            <Td data-label="καταναλώθηκαν" isNumeric>{row.used}</Td>
            <Td data-label="δεσμεύτηκαν" isNumeric>{row.reserved}</Td>
            <Td data-label="υπόλοιπο" isNumeric>{row.balance}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
