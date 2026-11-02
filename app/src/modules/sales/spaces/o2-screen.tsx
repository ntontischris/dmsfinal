import { getViewer } from "@/modules/access";
import {
  RecentChanges,
  SpacesSettingsTabs,
  recentChanges,
} from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { ListEditor } from "../components/list-editor";
import { SalesRoutingCard } from "../components/sales-routing-card";
import { StagesEditor } from "../components/stages-editor";
import { salesCaps } from "../helpers";
import { LIST_LABELS } from "../labels";
import { listSalesLists } from "../queries-lists";
import { listAssignableUsers } from "../queries-queue";
import { getSalesSettings, listListUsage } from "../queries-settings";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  label: "Ετικέτα",
  sort: "Σειρά",
  retired_at: "Απόσυρση",
  form_routing: "Πού πάνε οι νέες Ευκαιρίες",
  form_assignee_id: "Συγκεκριμένο πρόσωπο",
};

const AUDITED = [
  "sales_stages",
  "sales_sources",
  "sales_loss_reasons",
  "sales_activity_kinds",
  "sales_settings",
];

// O2 Ρυθμίσεις › Πωλήσεις στη νέα εμφάνιση: οι καρτέλες Ρυθμίσεων του prototype (`screens/O2.tsx`)· οι κάρτες
// (δρομολόγηση, Στάδια, λίστες, τελευταίες αλλαγές) είναι οι σημερινές, ως [data-tw], με τις πραγματικές ενέργειές τους.
export async function SpacesSalesSettings({
  showRetired,
}: {
  showRetired: boolean;
}) {
  const viewer = await getViewer();
  if (!salesCaps(viewer).canManageSettings)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
        </StateNotice>
      </div>
    );
  const [lists, settings, usage, assignable, changes] = await Promise.all([
    listSalesLists(),
    getSalesSettings(),
    listListUsage(),
    listAssignableUsers(),
    recentChanges(AUDITED),
  ]);
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O2" />
      {!lists.ok || !settings.ok || !usage.ok || !assignable.ok ? (
        <ErrorNotice what="τις Ρυθμίσεις των Πωλήσεων" />
      ) : (
        <div data-tw>
          <div className="grid gap-4">
            <SalesRoutingCard
              settings={settings.data}
              assignable={assignable.data}
            />
            <StagesEditor
              items={lists.data.stages}
              usage={usage.data}
              showRetired={showRetired}
            />
            <ListEditor
              list="sources"
              title={LIST_LABELS.sources}
              items={lists.data.sources}
              usage={usage.data}
              showRetired={showRetired}
            />
            <ListEditor
              list="loss_reasons"
              title={LIST_LABELS.loss_reasons}
              items={lists.data.lossReasons}
              usage={usage.data}
              showRetired={showRetired}
            />
            <ListEditor
              list="activity_kinds"
              title={LIST_LABELS.activity_kinds}
              items={lists.data.activityKinds}
              usage={usage.data}
              showRetired={showRetired}
            />
            {changes.ok && (
              <RecentChanges
                changes={changes.data}
                labelOf={(field) => FIELD_LABELS[field] ?? field}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
