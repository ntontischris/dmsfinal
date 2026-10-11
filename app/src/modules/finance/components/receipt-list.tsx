import { Notice } from "@/components/ui/notice";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { RECEIPT_EMPTY_TEXT, RECEIPT_EMPTY_TITLE } from "../labels";
import { formatReceiptDate, formatReceiptMoney } from "../money";
import type { PaymentMethod, ReceiptRow } from "../types";

import { ReceiptActions } from "./receipt-actions";

interface ReceiptListProps {
  rows: readonly ReceiptRow[];
  methods: readonly PaymentMethod[];
}

// Οι Εισπράξεις, φθίνουσα ημερομηνία. Η διαγραφή και η διόρθωση μένουν στο Ίχνος· μια διαγραμμένη δείχνει τον λόγο.
export function ReceiptList({ rows, methods }: ReceiptListProps) {
  if (rows.length === 0) {
    return (
      <Notice kind="empty" title={RECEIPT_EMPTY_TITLE}>
        <p className="m-0">{RECEIPT_EMPTY_TEXT}</p>
      </Notice>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>Ημερομηνία</Th>
          <Th>Πελάτης</Th>
          <Th isNumeric>Ποσό</Th>
          <Th>Τρόπος</Th>
          <Th>Σημείωση</Th>
          <Th>Ποιος</Th>
          <Th>Ενέργειες</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <ReceiptTableRow key={row.id} row={row} methods={methods} />
        ))}
      </tbody>
    </Table>
  );
}

function ReceiptTableRow({
  row,
  methods,
}: {
  row: ReceiptRow;
  methods: readonly PaymentMethod[];
}) {
  const methodOptions = methods.filter(
    (method) => !method.retired || method.id === row.methodId,
  );
  return (
    <Tr>
      <Td data-label="Ημερομηνία">{formatReceiptDate(row.receivedOn)}</Td>
      <Td data-label="Πελάτης">{row.clientName}</Td>
      <Td data-label="Ποσό" isNumeric>
        {formatReceiptMoney(row.amount)}
      </Td>
      <Td data-label="Τρόπος">{row.methodLabel}</Td>
      <Td data-label="Σημείωση">{row.note}</Td>
      <Td data-label="Ποιος">{row.createdByName}</Td>
      <Td data-label="Ενέργειες">
        {row.deleted ? (
          <span className="text-sm text-muted-foreground">
            Διαγράφηκε. Λόγος: {row.deleteReason}
          </span>
        ) : (
          row.canEdit && <ReceiptActions row={row} methods={methodOptions} />
        )}
      </Td>
    </Tr>
  );
}
