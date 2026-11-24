import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { correctHref, reminderHref } from "../invoice-detail-helpers";
import { pdfHref } from "../invoices-helpers";
import { KIND_LABELS, STATUS_LABELS } from "../invoices-labels";
import type { InvoiceItem } from "../invoices-view-schema";
import { dueNoteOf } from "./i2-model";

import "./money-lines.css";

interface InvoiceTableProps {
  rows: readonly InvoiceItem[];
  today: string;
  canEdit: boolean;
  // Ο Χρήστης πελάτη δεν βλέπει στήλη Πελάτη (prototype: showClient).
  showClient?: boolean;
  // Η ομάδα ανοίγει τη σελίδα του Τιμολογίου (I8) και καταχωρεί Είσπραξη από τη γραμμή (d3, d4).
  canOpen?: boolean;
  canCollect?: boolean;
  // Τ4: «Υπενθύμιση» στη γραμμή ληξιπρόθεσμου, για όποιον καταχωρεί Τιμολόγια.
  canRemind?: boolean;
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

function InvoiceNumber({ row, canOpen }: { row: InvoiceItem; canOpen: boolean }) {
  return canOpen ? (
    <Link className="i2-code" href={hrefOf("I8", { id: row.id })}>
      {row.number}
    </Link>
  ) : (
    <span className="i2-code">{row.number}</span>
  );
}

function MainCell({
  row,
  today,
  showClient,
  canOpen,
}: {
  row: InvoiceItem;
  today: string;
  showClient: boolean;
  canOpen: boolean;
}) {
  const due = dueNoteOf(row, today);
  return (
    <td className="ml-main">
      <span className="ml-tag">
        {STATUS_LABELS[row.status]}
        {due ? ` · ${due}` : ""}
      </span>
      <strong>
        {showClient ? row.clientName : <InvoiceNumber row={row} canOpen={canOpen} />}
      </strong>
      <small>
        {showClient && (
          <>
            <InvoiceNumber row={row} canOpen={canOpen} />
            {" · "}
          </>
        )}
        {KIND_LABELS[row.kind]} · έκδοση {fmtDate(row.issueDate)}
        {row.dueDate ? ` · λήξη ${fmtDate(row.dueDate)}` : ""}
        {row.creditForNumber ? ` · διορθώνει ${row.creditForNumber}` : ""}
      </small>
    </td>
  );
}

function AmountCell({ row }: { row: InvoiceItem }) {
  const isOpen = row.remaining > 0;
  return (
    <td className="ml-amount">
      {fmtMoney(isOpen ? row.remaining : row.total)}
      <small>
        {isOpen
          ? `υπόλοιπο από ${fmtMoney(row.total)}`
          : "σύνολο με ΦΠΑ"}
        {row.paid > 0 && isOpen ? ` · μπήκαν ${fmtMoney(row.paid)}` : ""}
      </small>
    </td>
  );
}

function Actions({
  row,
  canEdit,
  canCollect,
  canRemind,
}: {
  row: InvoiceItem;
  canEdit: boolean;
  canCollect: boolean;
  canRemind: boolean;
}) {
  return (
    <td className="ml-quick">
      {canCollect && row.kind !== "credit" && row.remaining > 0 && (
        <Link
          data-primary
          href={hrefOf("I4", { client: row.clientId, invoice: row.id })}
          title="Καταχώρηση Είσπραξης για αυτό το Τιμολόγιο"
        >
          Ήρθε πληρωμή
        </Link>
      )}
      {canRemind && row.status === "overdue" && (
        <Link href={reminderHref(row.id)} title="Στείλε υπενθύμιση στον Πελάτη">
          Υπενθύμιση
        </Link>
      )}
      <a href={pdfHref(row.id)} target="_blank" rel="noreferrer">
        PDF
      </a>
      {canEdit && (
        <Link href={correctHref(row.id)} title="Διόρθωση/ακύρωση">
          Διόρθωση
        </Link>
      )}
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
  canRemind = false,
}: InvoiceTableProps & { row: InvoiceItem }) {
  return (
    <tr
      className="ml-line"
      data-urgent={row.status === "overdue" ? "" : undefined}
    >
      <td className="ml-thumb" aria-hidden>
        {showClient ? initialsOf(row.clientName) : "€"}
      </td>
      <MainCell
        row={row}
        today={today}
        showClient={showClient}
        canOpen={canOpen}
      />
      <AmountCell row={row} />
      <Actions
        row={row}
        canEdit={canEdit}
        canCollect={canCollect}
        canRemind={canRemind}
      />
    </tr>
  );
}

// Τα Τιμολόγια ως γραμμές του prototype (`dms/xrimata`, «Μας χρωστούν»): πλακίδιο Πελάτη, ετικέτα κατάστασης,
// όνομα, υπόλοιπο και «Ήρθε πληρωμή». Μένει <table> με μία <tr> ανά Τιμολόγιο· PDF και Διόρθωση στις πραγματικές διαδρομές.
export function InvoiceTable({
  rows,
  today,
  canEdit,
  showClient = true,
  canOpen = false,
  canCollect = false,
  canRemind = false,
}: InvoiceTableProps) {
  return (
    <table className="ml-table ml-list">
      <thead>
        <tr>
          <th>Πελάτης</th>
          <th>Τιμολόγιο</th>
          <th>Ποσό</th>
          <th>Ενέργειες</th>
        </tr>
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
            canRemind={canRemind}
          />
        ))}
      </tbody>
    </table>
  );
}
