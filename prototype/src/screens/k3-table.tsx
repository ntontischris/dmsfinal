import Link from "next/link";

import { findEvent, SYSTEM_MESSAGES, type Send } from "@/data/notifications";
import { findAutomation } from "@/data/notifications-access";
import type { RoleId } from "@/data/roles";
import { SALES_CLIENTS } from "@/data/sales";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

import "./k3.css";

const clientName = (id: string | undefined): string =>
  SALES_CLIENTS.find((c) => c.id === id)?.name ?? "";

const whenOf = (iso: string): string => {
  const [date, time] = iso.split("T");
  return `${fmtDate(date)} ${time}`;
};

function Source({ role, send }: { role: RoleId; send: Send }) {
  if (send.source.kind === "σύστημα") {
    const { systemId } = send.source;
    const title =
      SYSTEM_MESSAGES.find((m) => m.id === systemId)?.title ?? systemId;
    return (
      <Link href={screenHref(role, "K2", { message: systemId })}>
        Μήνυμα συστήματος: {title}
      </Link>
    );
  }
  const eventId = findAutomation(send.source.automationId)?.eventId;
  if (!eventId) return <span>Αυτοματισμός</span>;
  return (
    <Link href={screenHref(role, "K1", { event: String(eventId) })}>
      Γεγονός {eventId}: {findEvent(eventId)?.title}
    </Link>
  );
}

const isAttention = (s: Send): boolean =>
  s.state === "απέτυχε" || s.state === "ξαναδοκιμάζεται";

interface SendTableProps {
  role: RoleId;
  sends: readonly Send[];
  hasRetry: boolean;
}

export function SendTable({ role, sends, hasRetry }: SendTableProps) {
  return (
    <div className="scroll">
      <table className="rtable">
        <thead>
          <tr>
            <th>Πότε</th>
            <th>Τι</th>
            <th>Πηγή</th>
            <th>Κανάλι</th>
            <th>Παραλήπτης</th>
            <th>Κατάσταση</th>
            <th>Λόγος</th>
            <th className="num">Προσπάθειες</th>
            {hasRetry && <th>Ενέργεια</th>}
          </tr>
        </thead>
        <tbody>
          {sends.map((s) => (
            <SendRow key={s.id} role={role} send={s} hasRetry={hasRetry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SendRowProps {
  role: RoleId;
  send: Send;
  hasRetry: boolean;
}

function SendRow({ role, send: s, hasRetry }: SendRowProps) {
  const client = clientName(s.clientId);
  return (
    <tr>
      <td data-label="Πότε">{whenOf(s.at)}</td>
      <td data-label="Τι" className="k3-cell">
        {s.title}
      </td>
      <td data-label="Πηγή" className="k3-cell">
        <Source role={role} send={s} />
      </td>
      <td data-label="Κανάλι">{s.channel}</td>
      <td data-label="Παραλήπτης" className="k3-cell">
        {s.recipient.name}
        {client && <span className="k3-sub">Πελάτης: {client}</span>}
      </td>
      <td data-label="Κατάσταση">
        <Badge tone={isAttention(s) ? "attention" : undefined}>{s.state}</Badge>
      </td>
      <td data-label="Λόγος" className="k3-cell">
        {s.reason ?? "—"}
      </td>
      <td data-label="Προσπάθειες" className="num">
        {s.attempts}
      </td>
      {hasRetry && (
        <td data-label="Ενέργεια">
          <button type="button" className="button">
            Ξαναστείλε
          </button>
        </td>
      )}
    </tr>
  );
}
