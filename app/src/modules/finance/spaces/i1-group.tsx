import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { daysText, reasonText, sortItemsByDate } from "../billables-helpers";
import type { BillableClient, BillableItem } from "../billables-view-schema";

const URGENT_DAYS = 30;

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

const countText = (n: number): string =>
  `${n} ${n === 1 ? "Τιμολογητέο" : "Τιμολογητέα"}`;

const agreementsOf = (items: readonly BillableItem[]): readonly string[] => [
  ...new Set(items.map((row) => row.agreementTitle).filter(Boolean)),
];

function BillableRow({ row }: { row: BillableItem }) {
  return (
    <tr className="ml-line">
      <td className="ml-thumb" aria-hidden>
        {row.daysOpen}
      </td>
      <td className="ml-main i13-cell">
        <span className="ml-tag">{reasonText(row.reason)}</span>
        <strong>{row.agreementTitle || "—"}</strong>
        <small>
          {fmtDate(row.billableOn)}
          {row.label ? ` · ${row.label}` : ""} · {daysText(row.daysOpen)}
        </small>
      </td>
      <td className="ml-amount">
        {fmtMoney(row.net)}
        {row.open < row.net && <small>ανοιχτό {fmtMoney(row.open)}</small>}
      </td>
    </tr>
  );
}

function BillableTable({ items }: { items: readonly BillableItem[] }) {
  return (
    <table className="ml-table ml-list">
      <caption className="i13-caption">Τιμολογητέα</caption>
      <thead>
        <tr>
          <td aria-hidden="true" />
          <th scope="col">Τιμολογητέο</th>
          <th scope="col">Ποσό (καθαρό)</th>
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

// d1: μόνο ό,τι στάλθηκε πραγματικά· αλλιώς πόσο περιμένει.
function RemindersBox({ items }: { items: readonly BillableItem[] }) {
  const sent = items.filter((row) => row.lastReminderAt);
  return (
    <details className="ml-box">
      <summary>
        <strong>Υπενθυμίσεις</strong>
        <small>
          {sent.length > 0
            ? `${sent.length} στάλθηκαν`
            : "καμία ακόμη · στέλνονται μόνες τους"}
        </small>
      </summary>
      <ul>
        {sortItemsByDate(items).map((row) => (
          <li key={row.id}>
            {row.label || reasonText(row.reason)} ·{" "}
            {row.lastReminderAt ? (
              <Badge tone="attention">
                {`υπενθύμιση στάλθηκε ${fmtDate(row.lastReminderAt)}`}
              </Badge>
            ) : (
              `περιμένει ${daysText(row.daysOpen)}`
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

interface GroupProps {
  group: BillableClient;
  canRegister: boolean;
}

function ClientPage({ group, canRegister }: GroupProps) {
  const { items, open, beyond } = group;
  const agreements = agreementsOf(items);
  return (
    <div className="ml-page">
      <header className="ml-hero">
        <span className="ml-hero-mono" aria-hidden>
          {initialsOf(group.clientName)}
        </span>
        <div>
          <h3>{group.clientName}</h3>
          <p>
            {fmtMoney(open)} προς τιμολόγηση · {countText(items.length)}
          </p>
          {beyond > 0 && (
            <Badge tone="attention">
              τιμολογήθηκε πέρα από τα Τιμολογητέα κατά {fmtMoney(beyond)}
            </Badge>
          )}
        </div>
        {canRegister && (
          <span className="ml-quick">
            <Link data-primary href={hrefOf("I3", { client: group.clientId })}>
              Καταχώρηση Τιμολογίου
            </Link>
          </span>
        )}
      </header>
      <details className="ml-box">
        <summary>
          <strong>Τιμολογητέα</strong>
          <small>
            {countText(items.length)} · {fmtMoney(open)}
          </small>
        </summary>
        <BillableTable items={items} />
      </details>
      <details className="ml-box">
        <summary>
          <strong>Συμφωνίες</strong>
          <small>από πού έρχονται τα ποσά</small>
        </summary>
        <ul>
          {agreements.length > 0 ? (
            agreements.map((title) => <li key={title}>{title}</li>)
          ) : (
            <li>—</li>
          )}
        </ul>
      </details>
      <RemindersBox items={items} />
    </div>
  );
}

// Ένας Πελάτης ως γραμμή του prototype (`dms/xrimata`): πλακίδιο, ετικέτα ηλικίας, όνομα, ποσό, «Τιμολόγησε».
// Ανοίγει τη σελίδα του μέσα στη λίστα (κλειστή εξ αρχής), με τα πραγματικά Τιμολογητέα του billables_view.
export function ClientGroup({ group, canRegister }: GroupProps) {
  const { items, open, oldestDays } = group;
  const isUrgent =
    oldestDays >= URGENT_DAYS || items.some((row) => row.lastReminderAt);
  const agreements = agreementsOf(items);
  return (
    <li>
      <details className="ml-item" data-urgent={isUrgent ? "" : undefined}>
        <summary className="ml-line">
          <span className="ml-thumb" aria-hidden>
            {initialsOf(group.clientName)}
          </span>
          <span className="ml-main">
            <span className="ml-tag">
              {oldestDays === 0 ? "σήμερα" : daysText(oldestDays)}
            </span>
            <strong>{group.clientName}</strong>
            <small>
              {countText(items.length)}
              {agreements[0] ? ` · από ${agreements[0]}` : ""}
            </small>
          </span>
          <span className="ml-amount">{fmtMoney(open)}</span>
          {canRegister && (
            <span className="ml-quick">
              <Link href={hrefOf("I3", { client: group.clientId })}>
                Τιμολόγησε
              </Link>
            </span>
          )}
        </summary>
        <ClientPage group={group} canRegister={canRegister} />
      </details>
    </li>
  );
}
