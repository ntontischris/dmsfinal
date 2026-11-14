import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Entity } from "@/spaces/kit/parts";
import {
  Badge,
  fmtDate,
  fmtMoney,
  type BadgeTone,
} from "@/spaces/screens/shared";

import { correctHref } from "../invoice-detail-helpers";
import { pdfHref } from "../invoices-helpers";
import { KIND_LABELS, STATUS_LABELS } from "../invoices-labels";
import type { InvoiceItem, InvoiceStatus } from "../invoices-view-schema";
import { dueNoteOf } from "./i2-model";

interface InvoiceTableProps {
  rows: readonly InvoiceItem[];
  today: string;
  canEdit: boolean;
  // Ο Χρήστης πελάτη δεν βλέπει στήλη Πελάτη (prototype: showClient).
  showClient?: boolean;
  // Η ομάδα ανοίγει τη σελίδα του Τιμολογίου (I8) και καταχωρεί Είσπραξη από τη γραμμή (d3, d4).
  canOpen?: boolean;
  canCollect?: boolean;
}

function NumberCell({ row, canOpen }: { row: InvoiceItem; canOpen: boolean }) {
  return (
    <td data-label="Αριθμός" className="i2-number">
      {canOpen ? (
        <Link className="i2-code" href={hrefOf("I8", { id: row.id })}>
          {row.number}
        </Link>
      ) : (
        <span className="i2-code">{row.number}</span>
      )}
      {row.creditForNumber && (
        <span className="i245-sub">διορθώνει {row.creditForNumber}</span>
      )}
    </td>
  );
}

const TONES: Readonly<Record<InvoiceStatus, BadgeTone>> = {
  paid: "strong",
  overdue: "attention",
  credit: "faded",
  unpaid: "waiting",
  partial: "waiting",
};

function StatusCell({ row, today }: { row: InvoiceItem; today: string }) {
  const due = dueNoteOf(row, today);
  return (
    <td data-label="Κατάσταση">
      <Badge tone={TONES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
      {due && <span className="i245-sub">{due}</span>}
    </td>
  );
}

function AmountCells({ row }: { row: InvoiceItem }) {
  return (
    <>
      <td data-label="Σύνολο με ΦΠΑ" className="num i2-money">
        {fmtMoney(row.total)}
      </td>
      <td data-label="Εξοφλήθηκε" className="num">
        {fmtMoney(row.paid)}
      </td>
      <td
        data-label="Υπόλοιπο"
        className="num i2-remaining"
        data-open={row.remaining > 0 ? "true" : undefined}
      >
        {fmtMoney(row.remaining)}
      </td>
    </>
  );
}

function Actions({
  row,
  canEdit,
  canCollect,
}: {
  row: InvoiceItem;
  canEdit: boolean;
  canCollect: boolean;
}) {
  return (
    <td data-label="Ενέργειες" className="i2-actions">
      <div className="i2-actions-row">
        {canCollect && row.kind !== "credit" && row.remaining > 0 && (
          <Link
            href={hrefOf("I4", { client: row.clientId, invoice: row.id })}
            title="Καταχώρηση Είσπραξης για αυτό το Τιμολόγιο"
          >
            Είσπραξη
          </Link>
        )}
        <a
          className="button"
          href={pdfHref(row.id)}
          target="_blank"
          rel="noreferrer"
        >
          Λήψη PDF
        </a>
        {canEdit && (
          <Link href={correctHref(row.id)} title="Διόρθωση/ακύρωση">
            Διόρθωση
          </Link>
        )}
      </div>
    </td>
  );
}

function InvoiceRow({
  row,
  today,
  canEdit,
  showClient = true,
  canOpen = false,
  canCollect = false,
}: InvoiceTableProps & { row: InvoiceItem }) {
  return (
    <tr>
      <NumberCell row={row} canOpen={canOpen} />
      <td data-label="Είδος" className="i2-nowrap">
        {KIND_LABELS[row.kind]}
      </td>
      {showClient && (
        <td data-label="Πελάτης" className="i2-client">
          <Entity name={row.clientName} />
        </td>
      )}
      <td data-label="Έκδοση" className="i2-nowrap">
        {fmtDate(row.issueDate)}
      </td>
      <td data-label="Λήξη" className="i2-nowrap">
        {row.dueDate ? fmtDate(row.dueDate) : "—"}
      </td>
      <AmountCells row={row} />
      <StatusCell row={row} today={today} />
      <Actions row={row} canEdit={canEdit} canCollect={canCollect} />
    </tr>
  );
}

function HeadRow({ showClient }: { showClient: boolean }) {
  return (
    <tr>
      <th>Αριθμός</th>
      <th>Είδος</th>
      {showClient && <th>Πελάτης</th>}
      <th>Έκδοση</th>
      <th>Λήξη</th>
      <th className="num">Σύνολο με ΦΠΑ</th>
      <th className="num">Εξοφλήθηκε</th>
      <th className="num">Υπόλοιπο</th>
      <th>Κατάσταση</th>
      <th className="i2-actions">Ενέργειες</th>
    </tr>
  );
}

// Ο πίνακας Τιμολογίων του prototype (`screens/i2-table.tsx`) με πραγματικές γραμμές· το PDF και η Διόρθωση
// οδηγούν στις πραγματικές διαδρομές.
export function InvoiceTable({
  rows,
  today,
  canEdit,
  showClient = true,
  canOpen = false,
  canCollect = false,
}: InvoiceTableProps) {
  return (
    <div className="scroll">
      <table className="rtable i2-table">
        <thead>
          <HeadRow showClient={showClient} />
        </thead>
        <tbody>
          {rows.map((row) => (
            <InvoiceRow
              key={row.id}
              rows={rows}
              row={row}
              today={today}
              canEdit={canEdit}
              showClient={showClient}
              canOpen={canOpen}
              canCollect={canCollect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
