import Link from "next/link";
import { Fragment } from "react";

import type { Integration, IntegrationStatus } from "@/data/integrations";
import type { RoleId } from "@/data/roles";
import {
  Badge,
  fmtDate,
  fmtPercent,
  screenHref,
  type ScreenQuery,
} from "@/screens/shared";

// Μία κάρτα ανά σύνδεση (απόφαση Η): κατάσταση, σκοπός, χρήση έναντι ορίου, έλεγχος, ό,τι αλλάζει ο Ιδιοκτήτης.

const STATUS_TONE: Readonly<
  Record<IntegrationStatus, "attention" | "strong" | undefined>
> = {
  λειτουργεί: "strong",
  προσοχή: "attention",
  "δεν λειτουργεί": "attention",
  "δεν έχει στηθεί": undefined,
};

// "2026-09-20 10:45" → "20/09/2026 10:45"· το «—» μένει ως έχει.
export const fmtDateTime = (value: string): string => {
  const [date, time] = value.split(" ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return value;
  return time ? `${fmtDate(date)} ${time}` : fmtDate(date);
};

const fmtUsed = (value: number, unit: string): string =>
  unit === "$" ? `$${value.toFixed(2)}` : `${value} ${unit}`;

function UsageBar({ usage }: { usage: NonNullable<Integration["usage"]> }) {
  const ratio = Math.min(usage.used / usage.limit, 1);
  return (
    <div className="n5-usage">
      <div className="row">
        <span className="muted">{usage.label}</span>
        <span>
          {fmtUsed(usage.used, usage.unit)} από{" "}
          {fmtUsed(usage.limit, usage.unit)} ·{" "}
          <strong>{fmtPercent(ratio)}</strong>
        </span>
      </div>
      <div
        className="n5-bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
        aria-label={usage.label}
        data-high={ratio >= 0.7 ? "true" : undefined}
      >
        <span style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

function OwnerFields({ item }: { item: Integration }) {
  return (
    <div className="stack n5-fields">
      {item.ownerFields?.map((field, index) => (
        <span key={field.label} className="stack">
          <label htmlFor={`n5-${item.id}-${index}`}>{field.label}</label>
          <input
            id={`n5-${item.id}-${index}`}
            className="input"
            defaultValue={field.value}
            placeholder="δεν έχει οριστεί"
          />
        </span>
      ))}
      <p className="muted">
        Δημόσια αναγνωριστικά, όχι κλειδιά: τα αλλάζεις εσύ.
      </p>
      <button type="button" className="button" data-primary="true">
        Αποθήκευση
      </button>
    </div>
  );
}

interface CardProps {
  role: RoleId;
  query: ScreenQuery;
  item: Integration;
}

function IntegrationCard({ role, query, item }: CardProps) {
  const isChecked = query.check === item.id;
  return (
    <section className="card n5-card">
      <div className="card-title">
        <h3>{item.name}</h3>
        <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
      </div>
      <p className="muted">{item.purpose}</p>
      <dl className="dl">
        <dt>Τελευταία επιτυχία</dt>
        <dd>{fmtDateTime(item.lastOk)}</dd>
        {item.facts.map((fact) => (
          <Fragment key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </Fragment>
        ))}
      </dl>
      {item.usage && <UsageBar usage={item.usage} />}
      {item.warning && (
        <p className="note n5-warning" role="status">
          {item.warning}
        </p>
      )}
      {item.status === "δεν λειτουργεί" && (
        <p className="note n5-warning">
          Ειδοποιεί η{" "}
          <Link href={screenHref(role, "P2", {})}>Υγεία συστήματος (P2)</Link>.
        </p>
      )}
      {item.ownerFields && <OwnerFields item={item} />}
      {item.id === "ai" && (
        <p>
          Το πλαφόν αλλάζει στις{" "}
          <Link href={screenHref(role, "O1", {})}>
            Ρυθμίσεις › Εταιρεία › Βοηθός (O1)
          </Link>
          .
        </p>
      )}
      <div className="btn-row">
        <Link
          className="button"
          href={screenHref(role, "N5", {
            state: query.state,
            check: isChecked ? undefined : item.id,
          })}
        >
          Έλεγχος τώρα
        </Link>
      </div>
      {isChecked && (
        <p className="note" role="status">
          {item.status === "δεν έχει στηθεί"
            ? "Δεν έγινε έλεγχος: η σύνδεση δεν έχει στηθεί ακόμα."
            : "Έλεγχος μόλις τώρα: η σύνδεση απαντά. Η τελευταία επιτυχία ενημερώθηκε."}
        </p>
      )}
      <p className="muted n5-dev">Αλλάζει ο developer: {item.developerOnly}</p>
    </section>
  );
}

interface IntegrationsProps {
  role: RoleId;
  query: ScreenQuery;
  items: readonly Integration[];
}

export function IntegrationsSection({ role, query, items }: IntegrationsProps) {
  return (
    <section className="n5-section">
      <h2>Ενσωματώσεις</h2>
      <p className="note">
        Οι συνδέσεις στήνονται από τον developer, χωρίς κλειδιά εδώ. Εσύ βλέπεις
        κατάσταση και χρήση και τις ελέγχεις. Όταν μια σύνδεση πάει στο «δεν
        λειτουργεί», ειδοποιεί η{" "}
        <Link href={screenHref(role, "P2", {})}>Υγεία συστήματος (P2)</Link>.
      </p>
      <div className="grid2">
        {items.map((item) => (
          <IntegrationCard
            key={item.id}
            role={role}
            query={query}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}
