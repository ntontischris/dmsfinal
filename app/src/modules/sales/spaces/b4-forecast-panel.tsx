import { getViewer } from "@/modules/access";
import { Panel } from "@/spaces/kit/panel";
import { ErrorNotice } from "@/spaces/screens/shared";

import { canSeeAmounts } from "../helpers";
import { NO_MANAGER_LABEL } from "../labels";
import { getOpportunityForecast } from "../queries-forecast";
import { listHandoffCandidates } from "../queries-queue";
import type { ListItem, Opportunity, SalesCaps } from "../types";
import { ForecastEditor, ManagerChange } from "./b4-forecast";
import {
  closeText,
  probabilityText,
  valueText,
  weightedText,
} from "./forecast-adapter";

// B4 · Πρόβλεψη μιας ανοιχτής Ευκαιρίας (b3): τι περιμένουμε να φέρει και πότε. Η αλλαγή μένει κλειστή μέχρι να τη ζητήσεις.
export async function ForecastPanel({
  opportunity,
  stages,
  canWork,
}: {
  opportunity: Opportunity;
  stages: readonly ListItem[];
  canWork: boolean;
}) {
  if (opportunity.outcome !== "open") return null;
  const [viewer, found] = await Promise.all([
    getViewer(),
    getOpportunityForecast(opportunity.id),
  ]);
  if (!found.ok)
    return (
      <Panel label="Πρόβλεψη">
        <ErrorNotice what="η Πρόβλεψη" />
      </Panel>
    );
  const row = found.data.row;
  const hasAmounts = canSeeAmounts(viewer);
  const stage = stages.find((item) => item.id === opportunity.stageId);
  return (
    <Panel label="Πρόβλεψη" aside={hasAmounts ? weightedText(row) : undefined}>
      <dl className="dl">
        {hasAmounts && (
          <>
            <dt>Αξία</dt>
            <dd>{valueText(row)}</dd>
          </>
        )}
        <dt>Πιθανότητα</dt>
        <dd>{probabilityText(row)}</dd>
        {hasAmounts && (
          <>
            <dt>Σταθμισμένη</dt>
            <dd>{weightedText(row)}</dd>
          </>
        )}
        <dt>Αναμενόμενο κλείσιμο</dt>
        <dd>{closeText(row)}</dd>
      </dl>
      {canWork && (
        <details>
          <summary>Αλλαγή πρόβλεψης</summary>
          <ForecastEditor
            opportunityId={opportunity.id}
            forecast={found.data}
            stageProbability={stage?.probability ?? null}
            canSeeAmounts={hasAmounts}
          />
        </details>
      )}
    </Panel>
  );
}

const canHandOff = (caps: SalesCaps, o: Opportunity): boolean =>
  caps.canManage &&
  o.outcome === "open" &&
  o.managerId !== null &&
  (caps.canTransfer || o.managerId === caps.userId);

// B4 · Υπεύθυνος (b2): όνομα, ή επιλογή για όποιον «Μεταβιβάζει Υπεύθυνο» και για τον ίδιο τον Υπεύθυνο.
export async function ManagerField({
  opportunity,
  caps,
}: {
  opportunity: Opportunity;
  caps: SalesCaps;
}) {
  const name = opportunity.managerName ?? NO_MANAGER_LABEL;
  if (!canHandOff(caps, opportunity) || opportunity.managerId === null)
    return <>{name}</>;
  const found = await listHandoffCandidates();
  if (!found.ok) return <>{name}</>;
  const current = { userId: opportunity.managerId, name };
  const candidates = found.data.some((c) => c.userId === current.userId)
    ? found.data
    : [current, ...found.data];
  return (
    <ManagerChange
      opportunityId={opportunity.id}
      managerId={opportunity.managerId}
      candidates={candidates}
    />
  );
}
