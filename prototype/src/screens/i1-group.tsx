import Link from "next/link";

import { findAgreement } from "@/data/agreements";
import { ageInDays, type BillableCoverage } from "@/data/finance-access";
import type { RoleId } from "@/data/roles";
import { remindersSent, type BillingGroup } from "@/screens/i1-model";
import { Badge, fmtDate, fmtMoney, screenHref } from "@/screens/shared";

import "./i13.css";

function BillableRow({ row }: { row: BillableCoverage }) {
  const { billable: b } = row;
  const age = ageInDays(b.date);
  const sent = remindersSent(age);
  return (
    <tr>
      <td data-label="Ημερομηνία">{fmtDate(b.date)}</td>
      <td data-label="Συμφωνία" className="i13-cell">
        {findAgreement(b.agreementId)?.title ?? "—"}
      </td>
      <td data-label="Λόγος" className="i13-cell">
        {b.reason}
        <span className="i13-sub">{b.label}</span>
      </td>
      <td data-label="Ποσό" className="num">
        {fmtMoney(b.net)}
        {row.covered > 0 && (
          <span className="i13-sub">ανοιχτό {fmtMoney(row.open)}</span>
        )}
      </td>
      <td data-label="Μέρες ανοιχτό" className="num">
        {age}
      </td>
      <td data-label="Υπενθύμιση">
        <span className="i13-signals">
          {sent.length === 0 && "—"}
          {sent.map((d) => (
            <Badge key={d} tone="attention">{`${d} μ. στάλθηκε`}</Badge>
          ))}
        </span>
      </td>
    </tr>
  );
}

function BillableTable({ open }: { open: BillingGroup["open"] }) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Ημερομηνία</th>
          <th>Συμφωνία</th>
          <th>Λόγος</th>
          <th className="num">Ποσό (καθαρό)</th>
          <th className="num">Μέρες ανοιχτό</th>
          <th>Υπενθύμιση</th>
        </tr>
      </thead>
      <tbody>
        {open.map((row) => (
          <BillableRow key={row.billable.id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

interface GroupProps {
  role: RoleId;
  group: BillingGroup;
  canRegister: boolean;
}

export function ClientGroup({ role, group, canRegister }: GroupProps) {
  const { client, open, total, oldestAge, beyond } = group;
  return (
    <details className="card i13-group">
      <summary>
        <span className="i13-sum">
          <strong>{client.name}</strong>
          <span>{fmtMoney(total)} προς τιμολόγηση</span>
          <span className="muted">
            {open.length} Τιμολογητέα · παλαιότερο {oldestAge} μέρες
          </span>
          {beyond > 0 && (
            <Badge tone="attention">
              τιμολογήθηκε πέρα από τα Τιμολογητέα κατά {fmtMoney(beyond)}
            </Badge>
          )}
        </span>
      </summary>
      <div className="i13-body">
        {open.length > 0 && <BillableTable open={open} />}
        {canRegister && (
          <p>
            <Link
              className="button"
              data-primary="true"
              href={screenHref(role, "I3", { client: client.id })}
            >
              Καταχώρηση Τιμολογίου
            </Link>
          </p>
        )}
      </div>
    </details>
  );
}
