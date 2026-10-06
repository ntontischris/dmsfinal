import Link from "next/link";

import { personName } from "@/data/filming";
import type { InvoiceStanding } from "@/data/finance-access";
import type { RoleId } from "@/data/roles";
import { clientNameOf, correctedNumberOf } from "@/screens/i2-model";
import { PdfLink } from "@/screens/i2-ui";
import { Badge, fmtDate, fmtMoney, screenHref } from "@/screens/shared";

import "./i245.css";

interface InvoiceTableProps {
  role: RoleId;
  rows: readonly InvoiceStanding[];
  showClient: boolean;
  showTrail: boolean;
  canEdit: boolean;
}

function NumberCell(props: { s: InvoiceStanding; showTrail: boolean }) {
  const { invoice } = props.s;
  const corrected = correctedNumberOf(invoice);
  return (
    <td data-label="Αριθμός" className="i245-cell">
      {invoice.number}
      {corrected && <span className="i245-sub">διορθώνει {corrected}</span>}
      {props.showTrail &&
        invoice.corrections?.map((c) => (
          <span key={c.when + c.what} className="i245-sub">
            Διόρθωση ({personName(c.by)}, {fmtDate(c.when)}): {c.what}
          </span>
        ))}
    </td>
  );
}

function StatusCell({ s }: { s: InvoiceStanding }) {
  return (
    <td data-label="Κατάσταση">
      <Badge tone={s.status === "ληξιπρόθεσμο" ? "attention" : undefined}>
        {s.status}
      </Badge>
    </td>
  );
}

function AmountCells({ s }: { s: InvoiceStanding }) {
  return (
    <>
      <td data-label="Σύνολο" className="num">
        {fmtMoney(s.invoice.total)}
      </td>
      <td data-label="Εξοφλήθηκε" className="num">
        {fmtMoney(s.paid)}
      </td>
      <td data-label="Υπόλοιπο" className="num">
        {fmtMoney(s.remaining)}
      </td>
    </>
  );
}

function InvoiceRow(props: InvoiceTableProps & { s: InvoiceStanding }) {
  const { s, role } = props;
  const { invoice } = s;
  return (
    <tr>
      <NumberCell s={s} showTrail={props.showTrail} />
      <td data-label="Είδος">{invoice.kind}</td>
      {props.showClient && (
        <td data-label="Πελάτης" className="i245-cell">
          {clientNameOf(invoice.clientId)}
        </td>
      )}
      <td data-label="Έκδοση">{fmtDate(invoice.issueDate)}</td>
      <td data-label="Λήξη">
        {invoice.dueDate ? fmtDate(invoice.dueDate) : "—"}
      </td>
      <AmountCells s={s} />
      <StatusCell s={s} />
      <td data-label="PDF">
        <PdfLink pdf={invoice.pdf} />
      </td>
      {props.canEdit && (
        <td data-label="Ενέργειες">
          <Link href={screenHref(role, "I3", { invoice: invoice.id })}>
            Διόρθωση/ακύρωση
          </Link>
        </td>
      )}
    </tr>
  );
}

function HeadRow(props: { showClient: boolean; canEdit: boolean }) {
  return (
    <tr>
      <th>Αριθμός</th>
      <th>Είδος</th>
      {props.showClient && <th>Πελάτης</th>}
      <th>Έκδοση</th>
      <th>Λήξη</th>
      <th className="num">Σύνολο</th>
      <th className="num">Εξοφλήθηκε</th>
      <th className="num">Υπόλοιπο</th>
      <th>Κατάσταση</th>
      <th>PDF</th>
      {props.canEdit && <th>Ενέργειες</th>}
    </tr>
  );
}

export function InvoiceTable(props: InvoiceTableProps) {
  return (
    <table className="rtable">
      <thead>
        <HeadRow showClient={props.showClient} canEdit={props.canEdit} />
      </thead>
      <tbody>
        {props.rows.map((s) => (
          <InvoiceRow key={s.invoice.id} {...props} s={s} />
        ))}
      </tbody>
    </table>
  );
}
