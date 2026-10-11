import { Table, Td, Th, Tr } from "@/components/ui/table";

import { formatMoney } from "../billables-helpers";
import { moneyOrDash } from "../ledger-helpers";
import { LEDGER_COLUMNS } from "../ledger-labels";
import type { LedgerEntry } from "../ledger-view-schema";
import { formatReceiptDate } from "../money";

// Ο πίνακας κινήσεων της Καρτέλας (κάρτες στο κινητό): χρέωση, πίστωση και τρέχον υπόλοιπο.
export function LedgerTable({ entries }: { entries: readonly LedgerEntry[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{LEDGER_COLUMNS.date}</Th>
          <Th>{LEDGER_COLUMNS.entry}</Th>
          <Th isNumeric>{LEDGER_COLUMNS.debit}</Th>
          <Th isNumeric>{LEDGER_COLUMNS.credit}</Th>
          <Th isNumeric>{LEDGER_COLUMNS.running}</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <Tr key={`${entry.date}-${index}`}>
            <Td data-label={LEDGER_COLUMNS.date}>
              {formatReceiptDate(entry.date)}
            </Td>
            <Td data-label={LEDGER_COLUMNS.entry}>{entry.label}</Td>
            <Td data-label={LEDGER_COLUMNS.debit} isNumeric>
              {moneyOrDash(entry.debit)}
            </Td>
            <Td data-label={LEDGER_COLUMNS.credit} isNumeric>
              {moneyOrDash(entry.credit)}
            </Td>
            <Td data-label={LEDGER_COLUMNS.running} isNumeric>
              {formatMoney(entry.running)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
