import Link from "next/link";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import { getCostHint } from "@/modules/catalogue";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { costsCaps } from "../caps";
import { getCostDetail, listCostRows } from "../queries";
import type { CostDetail, CostGroup, CostRow } from "../types";
import {
  basisOf,
  defaultIdOf,
  internalEstimateOf,
  isInternalRow,
  pickerFilterOf,
  pickerGroupsOf,
  savedValueOf,
  type CostSettings,
  type PickerGroup,
} from "./g3-adapter";
import { G3Workbench } from "./g3-workbench";

import "./g3.css";

// G3 Κόστος και ώρες στη νέα εμφάνιση (prototype `screens/G3.tsx`): πάνω η κάρτα «Παραγωγή» (τρεις ομάδες, με αναζήτηση), από κάτω ο
// πάγκος της επιλεγμένης (?production=). Οι ομάδες, τα νούμερα και το Δικαίωμα έρχονται από τη βάση.

function Picker({
  groups,
  currentId,
}: {
  groups: readonly PickerGroup[];
  currentId: string;
}) {
  return (
    <FilterBar
      label="Παραγωγές"
      filters={[pickerFilterOf(groups, currentId)]}
    />
  );
}

// Τρεις αναγνώσεις, μία ανά ομάδα (σταθερό πλήθος, όχι ανά Παραγωγή), και οι Ρυθμίσεις κόστους.
async function loadPicker() {
  const [needs, overrun, rest, hint] = await Promise.all([
    listCostRows("needs_hours"),
    listCostRows("overrun"),
    listCostRows("rest"),
    getCostHint(),
  ]);
  if (!needs.ok || !overrun.ok || !rest.ok || !hint.ok || !hint.data)
    return null;
  const rows: Record<CostGroup, CostRow[]> = {
    needs_hours: needs.data,
    overrun: overrun.data,
    rest: rest.data,
  };
  const settings: CostSettings = {
    overrunPercent: hint.data.overrunPercent,
    multiplierMin: hint.data.multipliers.min,
  };
  return { groups: pickerGroupsOf(rows), settings };
}

function Workbench({
  row,
  settings,
}: {
  row: CostDetail;
  settings: CostSettings;
}) {
  return (
    <G3Workbench
      key={row.productionId}
      productionId={row.productionId}
      basis={basisOf(row, settings)}
      initialValue={savedValueOf(row)}
      suggestedShoot={row.actual.suggestedShootHours}
      internalEstimate={internalEstimateOf(row)}
      canManageCost={row.canEdit}
      isDelivered={row.state === "delivered"}
      isInternal={isInternalRow(row)}
    />
  );
}

function NotFound() {
  return (
    <StateNotice kind="empty" title="Δεν βρέθηκε η Παραγωγή">
      <p>
        <Link href={hrefOf("G1")}>Πίσω στις Παραγωγές</Link>
      </p>
    </StateNotice>
  );
}

async function G3Body({ productionId }: { productionId: string | undefined }) {
  const picker = await loadPicker();
  if (!picker) return <ErrorNotice what="το κόστος της Παραγωγής" />;
  const currentId = productionId ?? defaultIdOf(picker.groups);
  if (currentId === undefined)
    return (
      <StateNotice
        kind="empty"
        title="Δεν υπάρχει Παραγωγή με κόστος να δεις"
      />
    );
  const detail = await getCostDetail(currentId);
  if (!detail.ok) return <ErrorNotice what="το κόστος της Παραγωγής" />;
  if (detail.data === null) return <NotFound />;
  return (
    <>
      <Picker groups={picker.groups} currentId={currentId} />
      <header className="row g3-head">
        <Link href={hrefOf("G2", { id: currentId })}>
          Πίσω στην Παραγωγή (G2)
        </Link>
      </header>
      <Workbench row={detail.data} settings={picker.settings} />
    </>
  );
}


export async function SpacesCosts({ production }: { production?: string }) {
  const viewer = await getViewer();
  if (!costsCaps(viewer).canView)
    return (
      <div data-spaces>
        <div className="g3">
          <StateNotice kind="denied" title="Χωρίς δικαίωμα">
            <p>
              Το κόστος το βλέπουν μόνο όσοι «Βλέπουν κόστος και κερδοφορία».
            </p>
          </StateNotice>
        </div>
      </div>
    );
  const isValidId = production === undefined || z.uuid().safeParse(production).success;
  return (
    <div data-spaces>
      <div className="g3">
        {isValidId ? <G3Body productionId={production} /> : <NotFound />}
      </div>
    </div>
  );
}
