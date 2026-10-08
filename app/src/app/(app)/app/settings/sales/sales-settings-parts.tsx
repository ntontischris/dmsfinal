import { Notice } from "@/components/ui/notice";
import {
  LIST_LABELS,
  ListEditor,
  SalesRoutingCard,
  StagesEditor,
  getSalesSettings,
  listAssignableUsers,
  listListUsage,
  listSalesLists,
  type ListUsage,
  type SalesLists,
} from "@/modules/sales";
import { RecentChanges, recentChanges } from "@/modules/settings";

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

interface ListsSectionProps {
  lists: SalesLists;
  usage: ListUsage;
  showRetired: boolean;
}

// Τα Στάδια έχουν δικό τους editor (απόσυρση με μεταφορά)· οι άλλες τρεις λίστες είναι ίδιες μεταξύ τους.
function ListsSection({ lists, usage, showRetired }: ListsSectionProps) {
  return (
    <>
      <StagesEditor
        items={lists.stages}
        usage={usage}
        showRetired={showRetired}
      />
      <ListEditor
        list="sources"
        title={LIST_LABELS.sources}
        items={lists.sources}
        usage={usage}
        showRetired={showRetired}
      />
      <ListEditor
        list="loss_reasons"
        title={LIST_LABELS.loss_reasons}
        items={lists.lossReasons}
        usage={usage}
        showRetired={showRetired}
      />
      <ListEditor
        list="activity_kinds"
        title={LIST_LABELS.activity_kinds}
        items={lists.activityKinds}
        usage={usage}
        showRetired={showRetired}
      />
    </>
  );
}

// Όλα όσα διαβάζει η σελίδα, μαζί: αν κάτι δεν φορτώσει, δεν δείχνουμε μισές Ρυθμίσεις.
export async function SalesSettingsContent({
  showRetired,
}: {
  showRetired: boolean;
}) {
  const [lists, settings, usage, assignable, changes] = await Promise.all([
    listSalesLists(),
    getSalesSettings(),
    listListUsage(),
    listAssignableUsers(),
    recentChanges(AUDITED),
  ]);
  if (!lists.ok || !settings.ok || !usage.ok || !assignable.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσαν οι Ρυθμίσεις">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );
  return (
    <>
      <SalesRoutingCard settings={settings.data} assignable={assignable.data} />
      <ListsSection
        lists={lists.data}
        usage={usage.data}
        showRetired={showRetired}
      />
      {changes.ok && (
        <RecentChanges
          changes={changes.data}
          labelOf={(field) => FIELD_LABELS[field] ?? field}
        />
      )}
    </>
  );
}
