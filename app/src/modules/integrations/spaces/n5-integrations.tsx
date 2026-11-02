import Link from "next/link";
import type { ReactNode } from "react";

import { ListRow, Meter, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge, fmtPercent } from "@/spaces/screens/shared";

import { checkConnectionNow, saveAnalyticsIds } from "../actions";
import type { ConnectionId, ConnectionStatus } from "../connections";
import type { AnalyticsIds } from "../schemas";
import { lastOkOf, n5CardOf, type N5Usage } from "./n5-adapter";
import { N5Form } from "./n5-forms";

// Μία κάρτα ανά σύνδεση (prototype `screens/n5-integrations.tsx`): κατάσταση, σκοπός, χρήση έναντι ορίου, «Έλεγχος τώρα»,
// ό,τι αλλάζει ο Ιδιοκτήτης (GA4/Pixel). Όλα από την πραγματική κατάσταση (integrations_view + περιβάλλον).

const HEALTH_HREF = "/app/health";

function UsageBar({ usage }: { usage: N5Usage }) {
  return (
    <div className="n5-usage">
      <div className="row">
        <span className="muted">{usage.label}</span>
        <span>
          {usage.text} · <strong>{fmtPercent(usage.ratio)}</strong>
        </span>
      </div>
      <Meter
        used={usage.used}
        total={usage.limit}
        tone={usage.ratio >= 0.7 ? "attention" : undefined}
      />
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
      className="stack n5-fields"
    >
        <span className="stack">
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
        <span className="stack">
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
        <p className="muted">
          Δημόσια αναγνωριστικά, όχι κλειδιά: τα αλλάζεις εσύ.
        </p>
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
    <Panel
      label={card.name}
      aside={<Badge tone={card.tone}>{card.status}</Badge>}
    >
      <p className="muted">{card.purpose}</p>
      <div className="n5-bleed">
        <RowList>
          <ListRow
            title="Τελευταία επιτυχία"
            aside={<strong>{lastOkOf(item)}</strong>}
          />
          {card.facts.map((fact) => (
            <ListRow
              key={fact.label}
              title={fact.label}
              aside={<strong>{fact.value}</strong>}
            />
          ))}
        </RowList>
      </div>
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
    </Panel>
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
    <section className="n5-section" aria-label="Ενσωματώσεις">
      <h2 className="kit-label">Ενσωματώσεις</h2>
      <p className="note">
        Οι συνδέσεις στήνονται από τον developer, χωρίς κλειδιά εδώ. Εσύ βλέπεις
        κατάσταση και χρήση και τις ελέγχεις. Όταν μια σύνδεση πάει στο «δεν
        λειτουργεί», ειδοποιεί η{" "}
        <Link href={HEALTH_HREF}>Υγεία συστήματος</Link>.
      </p>
      <div className="grid2">
        {items.map((item) => (
          <IntegrationCard
            key={item.id}
            item={item}
            analytics={analytics}
            extra={extras[item.id]}
          />
        ))}
      </div>
    </section>
  );
}
