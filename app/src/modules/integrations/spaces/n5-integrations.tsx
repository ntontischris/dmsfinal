import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { fmtPercent } from "@/spaces/screens/shared";

import { checkConnectionNow, saveAnalyticsIds } from "../actions";
import type { ConnectionId, ConnectionStatus } from "../connections";
import type { AnalyticsIds } from "../schemas";
import { lastOkOf, n5CardOf, type N5Usage } from "./n5-adapter";
import { N5Form } from "./n5-forms";

// Ένα κουτί ανά σύνδεση (prototype `screens/n5-integrations.tsx`): κλειστό, με την κατάσταση στην περίληψη· ανοίγει
// μόνο του όταν η σύνδεση δεν λειτουργεί. Μέσα: σκοπός, χρήση έναντι ορίου, «Έλεγχος τώρα», ό,τι αλλάζει ο Ιδιοκτήτης.

const HEALTH_HREF = "/app/health";

function UsageBar({ usage }: { usage: N5Usage }) {
  const percent = Math.round(Math.min(usage.ratio, 1) * 100);
  return (
    <div className="n5-usage">
      <div
        className="ml-meter"
        role="meter"
        aria-label={usage.label}
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
        data-tone={usage.ratio >= 0.7 ? "warn" : undefined}
        style={{ "--v": `${percent}%` } as CSSProperties}
      >
        <span>{usage.label}</span>
        <i>
          <b />
        </i>
        <strong>{fmtPercent(usage.ratio)}</strong>
      </div>
      <small>{usage.text}</small>
    </div>
  );
}

// GA4 και Meta Pixel: δημόσια αναγνωριστικά, όχι κλειδιά. Τα αλλάζει ο Ιδιοκτήτης (saveAnalyticsIds).
function OwnerFields({ ids }: { ids: AnalyticsIds }) {
  return (
    <N5Form
      action={saveAnalyticsIds}
      submitLabel="Αποθήκευση"
      pendingLabel="Αποθήκευση…"
      isPrimary
      className="ml-fields"
    >
      <span className="ml-field">
        <label htmlFor="n5-analytics-ga4">
          Google Analytics, Measurement ID
        </label>
        <input
          id="n5-analytics-ga4"
          name="ga4"
          className="input"
          defaultValue={ids.ga4}
          placeholder="δεν έχει οριστεί"
          autoComplete="off"
        />
      </span>
      <span className="ml-field">
        <label htmlFor="n5-analytics-pixel">Meta Pixel ID</label>
        <input
          id="n5-analytics-pixel"
          name="pixel"
          className="input"
          defaultValue={ids.pixel}
          placeholder="δεν έχει οριστεί"
          inputMode="numeric"
          autoComplete="off"
        />
      </span>
      <small className="ml-field" data-wide>
        Δημόσια αναγνωριστικά, όχι κλειδιά: τα αλλάζεις εσύ.
      </small>
    </N5Form>
  );
}

interface CardProps {
  item: ConnectionStatus;
  analytics: AnalyticsIds;
  // Ό,τι άλλο μπαίνει σε μια κάρτα από άλλο module (π.χ. το δοκιμαστικό email).
  extra?: ReactNode;
}

function IntegrationCard({ item, analytics, extra }: CardProps) {
  const card = n5CardOf(item);
  return (
    <details className="ml-box n5-card" open={card.isDown || undefined}>
      <summary>
        <h2 className="ml-box-title">{card.name}</h2>
        <small>{card.status}</small>
      </summary>
      <p className="muted">{card.purpose}</p>
      <dl className="ml-kv">
        <dt>Τελευταία επιτυχία</dt>
        <dd>{lastOkOf(item)}</dd>
        {card.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {card.usage && <UsageBar usage={card.usage} />}
      {card.warning && (
        <p className="note n5-warning" role="status">
          {card.warning}
        </p>
      )}
      {card.isNotSetUp && (
        <p className="note">Δεν έχει στηθεί ακόμα. Τη στήνει ο developer.</p>
      )}
      {card.isDown && (
        <p className="note n5-warning">
          Ειδοποιεί η <Link href={HEALTH_HREF}>Υγεία συστήματος</Link>.
        </p>
      )}
      {card.id === "analytics" && <OwnerFields ids={analytics} />}
      {card.id === "ai" && (
        <p>
          Το πλαφόν αλλάζει στις{" "}
          <Link href="/app/settings/company">
            Ρυθμίσεις › Εταιρεία › Βοηθός
          </Link>
          .
        </p>
      )}
      {extra}
      {card.isCheckable && (
        <N5Form
          action={checkConnectionNow}
          submitLabel="Έλεγχος τώρα"
          pendingLabel="Έλεγχος…"
        >
          <input type="hidden" name="connection" value={card.id} />
        </N5Form>
      )}
      <p className="muted n5-dev">Αλλάζει ο developer: {card.developerOnly}</p>
    </details>
  );
}

interface IntegrationsProps {
  items: readonly ConnectionStatus[];
  analytics: AnalyticsIds;
  extras?: Partial<Record<ConnectionId, ReactNode>>;
}

export function IntegrationsSection({
  items,
  analytics,
  extras = {},
}: IntegrationsProps) {
  return (
    <section className="ml-stack" aria-label="Ενσωματώσεις">
      <p className="note">
        Οι συνδέσεις στήνονται από τον developer, χωρίς κλειδιά εδώ. Εσύ βλέπεις
        κατάσταση και χρήση και τις ελέγχεις. Όταν μια σύνδεση πάει στο «δεν
        λειτουργεί», ειδοποιεί η{" "}
        <Link href={HEALTH_HREF}>Υγεία συστήματος</Link>.
      </p>
      {items.map((item) => (
        <IntegrationCard
          key={item.id}
          item={item}
          analytics={analytics}
          extra={extras[item.id]}
        />
      ))}
    </section>
  );
}
