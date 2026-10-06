import Link from "next/link";

import { DELIVERABLE_RULES } from "@/data/deliverables";
import { deadlineOf, productionOf } from "@/data/deliverables-access";
import { personName } from "@/data/filming";
import type { DeliverableSummary } from "@/data/productions";
import { daysWaiting } from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import {
  deadlineLabel,
  hasBrokenLink,
  isOverLimit,
  kindLabel,
  productionLabel,
  waitingOn,
} from "@/screens/h1-model";
import { Badge, screenHref } from "@/screens/shared";

import "./h1.css";

interface RowsProps {
  role: RoleId;
  items: readonly DeliverableSummary[];
}

function TitleCell({ role, d }: { role: RoleId; d: DeliverableSummary }) {
  const production = productionOf(d);
  return (
    <td data-label="Παραδοτέο" className="h1-cell">
      <Link href={screenHref(role, "H2", { id: d.id })}>{d.title}</Link>
      <span className="h1-sub">
        {production ? (
          <Link href={screenHref(role, "G2", { id: production.id })}>
            {productionLabel(d)}
          </Link>
        ) : (
          "—"
        )}
      </span>
    </td>
  );
}

export function ForMeTable({ role, items }: RowsProps) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραδοτέο</th>
          <th>Είδος</th>
          <th>Ανατεθειμένος</th>
          <th>Τι περιμένει</th>
          <th>Προθεσμία</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {items.map((d) => (
          <tr key={d.id}>
            <TitleCell role={role} d={d} />
            <td data-label="Είδος">{kindLabel(d)}</td>
            <td data-label="Ανατεθειμένος">{personName(d.assigneeId)}</td>
            <td data-label="Τι περιμένει" className="h1-cell">
              {waitingOn(d)}
            </td>
            <td data-label="Προθεσμία" className="h1-cell">
              {deadlineLabel(d)}
            </td>
            <td data-label="Σήματα">
              <span className="h1-signals">
                {deadlineOf(d).isLate && (
                  <Badge tone="attention">καθυστερεί</Badge>
                )}
                {isOverLimit(d) && <Badge tone="attention">πέρα από το όριο</Badge>}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ClientQueueTable({ role, items }: RowsProps) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραδοτέο</th>
          <th>Έκδοση</th>
          <th>Αναμονή</th>
          <th>Υπενθυμίσεις</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {items.map((d) => (
          <ClientQueueRow key={d.id} role={role} d={d} />
        ))}
      </tbody>
    </table>
  );
}

function ClientQueueRow({ role, d }: { role: RoleId; d: DeliverableSummary }) {
  const days = daysWaiting(d);
  return (
    <tr>
      <TitleCell role={role} d={d} />
      <td data-label="Έκδοση">{d.latest ? `v${d.latest.version}` : "—"}</td>
      <td data-label="Αναμονή">{days} μέρες</td>
      <td data-label="Υπενθυμίσεις" className="h1-cell">
        {remindersLabel(days)}
      </td>
      <td data-label="Σήματα">
        {hasBrokenLink(d) && <Badge tone="attention">δεν ανοίγει το link</Badge>}
      </td>
    </tr>
  );
}

const remindersLabel = (days: number): string =>
  DELIVERABLE_RULES.reminderDays
    .map((n) => `${n}η μέρα: ${days >= n ? "στάλθηκε" : "όχι ακόμα"}`)
    .join(" · ");
