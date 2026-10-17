import Link from "next/link";
import type { ReactNode } from "react";

import type { ConnectionId } from "../connections";
import type { ConnectionsView } from "../status";
import { AnalyticsIdsForm } from "./analytics-ids-form";
import { ConnectionCard } from "./connection-card";

interface ConnectionsGridProps {
  view: ConnectionsView;
  // Ό,τι άλλο μπαίνει σε μια κάρτα από άλλο module (π.χ. το δοκιμαστικό email).
  extras?: Partial<Record<ConnectionId, ReactNode>>;
}

const AI_CAP_NOTE = (
  <p className="m-0 text-sm">
    Το πλαφόν αλλάζει στις{" "}
    <Link href="/app/settings/company">Ρυθμίσεις › Εταιρεία › Βοηθός</Link>.
  </p>
);

// Οι έξι κάρτες σύνδεσης της N5.
export function ConnectionsGrid({ view, extras = {} }: ConnectionsGridProps) {
  const own: Partial<Record<ConnectionId, ReactNode>> = {
    ai: AI_CAP_NOTE,
    analytics: <AnalyticsIdsForm ids={view.analytics} />,
  };
  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Οι συνδέσεις στήνονται από τον developer, χωρίς κλειδιά εδώ. Εσύ βλέπεις
        κατάσταση και χρήση και τις ελέγχεις.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {view.connections.map((item) => (
          <ConnectionCard key={item.id} item={item}>
            {own[item.id]}
            {extras[item.id]}
          </ConnectionCard>
        ))}
      </div>
    </div>
  );
}
