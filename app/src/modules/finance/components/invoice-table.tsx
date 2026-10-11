import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { formatMoney } from "../billables-helpers";
import { INVOICE_CORRECT_LINK } from "../invoice-corrections-labels";
import { correctHref } from "../invoice-detail-helpers";
import { pdfHref, statusTone } from "../invoices-helpers";
import {
  INVOICE_COLUMNS,
  INVOICE_PDF_LABEL,
  KIND_LABELS,
  STATUS_LABELS,
} from "../invoices-labels";
import type { InvoiceItem } from "../invoices-view-schema";
import { formatReceiptDate } from "../money";

interface InvoiceTableProps {
  rows: readonly InvoiceItem[];
  canCorrect?: boolean; // «Καταχωρεί Τιμολόγια»: ο σύνδεσμος «Διόρθωση» στις Ενέργειες
}

// Ο πίνακας των Τιμολογίων (κάρτες στο κινητό). Το PDF ανοίγει από το route, που φτιάχνει σύνδεσμο 60″.
export function InvoiceTable({ rows, canCorrect = false }: InvoiceTableProps) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{INVOICE_COLUMNS.number}</Th>
          <Th>{INVOICE_COLUMNS.kind}</Th>
          <Th>{INVOICE_COLUMNS.client}</Th>
          <Th>{INVOICE_COLUMNS.issued}</Th>
          <Th>{INVOICE_COLUMNS.due}</Th>
          <Th isNumeric>{INVOICE_COLUMNS.total}</Th>
          <Th isNumeric>{INVOICE_COLUMNS.paid}</Th>
          <Th isNumeric>{INVOICE_COLUMNS.remaining}</Th>
          <Th>{INVOICE_COLUMNS.status}</Th>
          <Th>{INVOICE_COLUMNS.actions}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <InvoiceRow key={row.id} row={row} canCorrect={canCorrect} />
        ))}
      </tbody>
    </Table>
  );
}

function InvoiceRow({
  row,
  canCorrect,
}: {
  row: InvoiceItem;
  canCorrect: boolean;
}) {
  return (
    <Tr>
      <Td data-label={INVOICE_COLUMNS.number}>
        <span className="font-medium">{row.number}</span>
        {row.creditForNumber && (
          <span className="block text-xs text-muted-foreground">
            διορθώνει {row.creditForNumber}
          </span>
        )}
      </Td>
      <Td data-label={INVOICE_COLUMNS.kind}>{KIND_LABELS[row.kind]}</Td>
      <Td data-label={INVOICE_COLUMNS.client}>{row.clientName}</Td>
      <Td data-label={INVOICE_COLUMNS.issued}>
        {formatReceiptDate(row.issueDate)}
      </Td>
      <Td data-label={INVOICE_COLUMNS.due}>
        {row.dueDate ? formatReceiptDate(row.dueDate) : "—"}
      </Td>
      <Td data-label={INVOICE_COLUMNS.total} isNumeric>
        {formatMoney(row.total)}
      </Td>
      <Td data-label={INVOICE_COLUMNS.paid} isNumeric>
        {formatMoney(row.paid)}
      </Td>
      <Td data-label={INVOICE_COLUMNS.remaining} isNumeric>
        {formatMoney(row.remaining)}
      </Td>
      <Td data-label={INVOICE_COLUMNS.status}>
        <Badge tone={statusTone(row.status)}>{STATUS_LABELS[row.status]}</Badge>
      </Td>
      <Td data-label={INVOICE_COLUMNS.actions}>
        <a
          href={pdfHref(row.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {INVOICE_PDF_LABEL}
          <span className="sr-only"> του {row.number}</span>
        </a>
        {canCorrect && (
          <Link
            href={correctHref(row.id)}
            className="ml-3 text-primary underline"
          >
            {INVOICE_CORRECT_LINK}
            <span className="sr-only"> του {row.number}</span>
          </Link>
        )}
      </Td>
    </Tr>
  );
}
