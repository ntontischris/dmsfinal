import { ErrorNotice } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import { listHandoffCandidates } from "../queries-queue";
import type { ReadResult } from "../read";
import type {
  ForecastRow,
  ListItem,
  Opportunity,
  OpportunityForecast,
  SalesCaps,
} from "../types";
import { ForecastEditor, ManagerChange } from "./b4-forecast";
import {
  closeText,
  probabilityText,
  valueText,
  weightedText,
} from "./forecast-adapter";

// Η υπόδειξη του κουτιού: η Πιθανότητα και η σταθμισμένη (με «Βλέπει ποσά»)· για τον Υπεύθυνο και η αλλαγή.
const hintOf = (
  row: ForecastRow | null,
  hasAmounts: boolean,
  canWork: boolean,
): string =>
  [
    `Πιθανότητα ${probabilityText(row)}`,
    hasAmounts ? `σταθμ. ${weightedText(row)}` : null,
    `κλείσιμο ${closeText(row)}`,
    canWork ? "Αλλαγή πρόβλεψης" : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");

function ForecastFacts(props: {
  row: ForecastRow | null;
  hasAmounts: boolean;
}) {
  const { row, hasAmounts } = props;
  return (
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
  );
}

// B4 · Πρόβλεψη μιας ανοιχτής Ευκαιρίας (b3) σε κλειστό κουτί: τι περιμένουμε να φέρει και πότε, και η αλλαγή της.
// Την ανάγνωση τη φέρνει η σελίδα (τη χρειάζεται και η κεφαλίδα για το μεγάλο ποσό).
export function ForecastBox({
  opportunity,
  stages,
  canWork,
  found,
  hasAmounts,
}: {
  opportunity: Opportunity;
  stages: readonly ListItem[];
  canWork: boolean;
  found: ReadResult<OpportunityForecast>;
  hasAmounts: boolean;
}) {
  const row = found.ok ? found.data.row : null;
  const stage = stages.find((item) => item.id === opportunity.stageId);
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">Πρόβλεψη</h2>
          <small>
            {found.ok ? hintOf(row, hasAmounts, canWork) : "Δεν διαβάστηκε"}
          </small>
        </summary>
        {!found.ok ? (
          <ErrorNotice what="η Πρόβλεψη" />
        ) : (
          <div className="b4-box-body">
            <ForecastFacts row={row} hasAmounts={hasAmounts} />
            {canWork && (
              <ForecastEditor
                opportunityId={opportunity.id}
                forecast={found.data}
                stageProbability={stage?.probability ?? null}
                canSeeAmounts={hasAmounts}
              />
            )}
          </div>
        )}
      </details>
    </section>
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
