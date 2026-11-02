import Link from "next/link";

import { Entity } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { reasonText, sortItemsByDate } from "../billables-helpers";
import type { BillableClient, BillableItem } from "../billables-view-schema";

function BillableRow({ row }: { row: BillableItem }) {
  return (
    <tr>
      <td data-label="Ημερομηνία">{fmtDate(row.billableOn)}</td>
      <td data-label="Συμφωνία" className="i13-cell">
        <strong>{row.agreementTitle || "—"}</strong>
      </td>
      <td data-label="Λόγος" className="i13-cell">
        {reasonText(row.reason)}
        <span className="i13-sub">{row.label}</span>
      </td>
      <td data-label="Ποσό" className="num i13-money">
        {fmtMoney(row.net)}
        {row.open < row.net && (
          <span className="i13-sub">ανοιχτό {fmtMoney(row.open)}</span>
        )}
      </td>
      <td data-label="Μέρες ανοιχτό" className="num">
        {row.daysOpen}
      </td>
      <td data-label="Υπενθύμιση">
        <span className="i13-signals">
          {row.reminders.length === 0 && "—"}
          {row.reminders.map((d) => (
            <Badge key={d} tone="attention">{`${d} μ. στάλθηκε`}</Badge>
          ))}
        </span>
      </td>
    </tr>
  );
}

function BillableTable({ items }: { items: readonly BillableItem[] }) {
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
        {sortItemsByDate(items).map((row) => (
          <BillableRow key={row.id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

interface GroupProps {
  group: BillableClient;
  canRegister: boolean;
}

// Η ομάδα ενός Πελάτη του prototype (`screens/i1-group.tsx`) από το billables_view.
export function ClientGroup({ group, canRegister }: GroupProps) {
  const { items, open, oldestDays, beyond } = group;
  return (
    <details className="kit-panel i13-group">
      <summary>
        <span className="i13-sum">
          <Entity
            name={group.clientName}
            sub={
              <>
                {items.length} {items.length === 1 ? "Τιμολογητέο" : "Τιμολογητέα"}{" "}
                · παλαιότερο {oldestDays} {oldestDays === 1 ? "μέρα" : "μέρες"}
              </>
            }
          />
          <span className="i13-total">
            <strong>{fmtMoney(open)}</strong> προς τιμολόγηση
          </span>
          {beyond > 0 && (
            <Badge tone="attention">
              τιμολογήθηκε πέρα από τα Τιμολογητέα κατά {fmtMoney(beyond)}
            </Badge>
          )}
        </span>
      </summary>
      <div className="i13-body">
        {items.length > 0 && <BillableTable items={items} />}
        {canRegister && (
          <p>
            <Link
              className="button"
              data-primary="true"
              href={hrefOf("I3", { client: group.clientId })}
            >
              Καταχώρηση Τιμολογίου
            </Link>
          </p>
        )}
      </div>
    </details>
  );
}
