import type { ConnectionStatus } from "@/modules/integrations";

import { GOOGLE, formatAt } from "../labels";
import type { HealthView } from "../schemas";
import { googleVerdict } from "../status";
import { HealthCard } from "./health-card";

// Ο συγχρονισμός Google: η κατάσταση από την κοινή πηγή της N5, οι αλλαγές σε ουρά από τη βάση (Γεγονός 52).
export function GoogleCard({
  view,
  connection,
}: {
  view: HealthView;
  connection: ConnectionStatus | null;
}) {
  const verdict = googleVerdict(view, connection);
  return (
    <HealthCard title={GOOGLE.title} verdict={verdict}>
      {verdict.reason && (
        <p className="m-0 text-sm text-destructive">{verdict.reason}</p>
      )}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{GOOGLE.lastSync}</dt>
        <dd className="m-0">
          {formatAt(connection?.lastSuccessAt ?? view.google.lastSyncAt)}
        </dd>
        <dt className="text-muted-foreground">{GOOGLE.queued}</dt>
        <dd className="m-0 tabular-nums">{view.google.pendingWrites}</dd>
      </dl>
      <p className="m-0 text-sm text-muted-foreground">{GOOGLE.rule}</p>
    </HealthCard>
  );
}
