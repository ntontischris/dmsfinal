import { can, getViewer } from "@/modules/access";
import {
  SpacesRecentChanges,
  SpacesSettingsTabs,
  o1ChangesOf,
  recentChanges,
} from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { salesCaps } from "../helpers";
import { LIST_LABELS } from "../labels";
import { listSalesLists } from "../queries-lists";
import { listAssignableUsers } from "../queries-queue";
import {
  getSalesSettings,
  listGuideSections,
  listListUsage,
} from "../queries-settings";
import type { ListName, ListUsage, SalesLists } from "../types";
import { toggleRetiredHref } from "./o2-adapter";
import { O2Guide } from "./o2-guide";
import { O2List } from "./o2-list";
import { O2Routing } from "./o2-routing";

import "./o2.css";

const AUDIT_HREF = "/app/audit?area=settings";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  label: "Ετικέτα",
  sort: "Σειρά",
  retired_at: "Απόσυρση",
  form_routing: "Πού πάνε οι νέες Ευκαιρίες",
  form_assignee_id: "Συγκεκριμένο πρόσωπο",
  knowledge_section_id: "Οδηγός πωλήσεων",
};

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  sales_stages: "Στάδια",
  sales_sources: "Πηγές",
  sales_loss_reasons: "Λόγοι απώλειας",
  sales_activity_kinds: "Είδη Δραστηριότητας",
  sales_settings: "Ρυθμίσεις Πωλήσεων",
};

const LISTS: readonly { list: ListName; key: keyof SalesLists }[] = [
  { list: "sources", key: "sources" },
  { list: "loss_reasons", key: "lossReasons" },
  { list: "activity_kinds", key: "activityKinds" },
];

function Lists({
  lists,
  usage,
  showRetired,
}: {
  lists: SalesLists;
  usage: ListUsage;
  showRetired: boolean;
}) {
  const common = {
    usage,
    showRetired,
    toggleRetiredHref: toggleRetiredHref(showRetired),
  };
  return (
    <>
      <O2List
        list="stages"
        title={LIST_LABELS.stages}
        items={lists.stages}
        {...common}
      />
      <p className="muted o-hint">
        Κερδισμένη και Χαμένη δεν είναι Στάδια: είναι σταθερή Έκβαση της
        Ευκαιρίας.
      </p>
      {LISTS.map(({ list, key }) => (
        <O2List
          key={list}
          list={list}
          title={LIST_LABELS[list]}
          items={lists[key]}
          {...common}
        />
      ))}
    </>
  );
}

// O2 Ρυθμίσεις › Πωλήσεις στη νέα εμφάνιση (prototype `screens/O2.tsx`): δρομολόγηση των νέων Ευκαιριών, Στάδια,
// Πηγές, Λόγοι απώλειας, Είδη Δραστηριότητας και τελευταίες αλλαγές, με τις πραγματικές ενέργειες.
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
  const [lists, settings, usage, assignable, changes, sections] =
    await Promise.all([
      listSalesLists(),
      getSalesSettings(),
      listListUsage(),
      listAssignableUsers(),
      recentChanges(Object.keys(ENTITY_LABELS)),
      listGuideSections(),
    ]);
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O2" />
      {!lists.ok || !settings.ok || !usage.ok || !assignable.ok ? (
        <ErrorNotice what="τις Ρυθμίσεις των Πωλήσεων" />
      ) : (
        <>
          <O2Routing settings={settings.data} assignable={assignable.data} />
          {sections.ok && (
            <O2Guide
              current={settings.data.guideSectionId}
              sections={sections.data}
            />
          )}
          <Lists
            lists={lists.data}
            usage={usage.data}
            showRetired={showRetired}
          />
          {changes.ok && (
            <SpacesRecentChanges
              changes={o1ChangesOf(changes.data, {
                entities: ENTITY_LABELS,
                fields: FIELD_LABELS,
              })}
              auditHref={can(viewer, "audit.view") ? AUDIT_HREF : null}
              areaLabel="Ρυθμίσεις"
            />
          )}
        </>
      )}
    </div>
  );
}
