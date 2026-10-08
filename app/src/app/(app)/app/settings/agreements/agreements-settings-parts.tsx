import { Notice } from "@/components/ui/notice";
import {
  ProvisionKindsEditor,
  getKindUsage,
  listProvisionKinds,
} from "@/modules/catalogue";
import { RecentChanges, recentChanges } from "@/modules/settings";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  label: "Ετικέτα",
  label_en: "Ετικέτα (EN)",
  unit: "Μονάδα",
  unit_en: "Μονάδα (EN)",
  measure: "Τρόπος μέτρησης",
  default_hours: "Προεπιλεγμένη διάρκεια",
  sort: "Σειρά",
  retired_at: "Απόσυρση",
};

// Όλα όσα διαβάζει η σελίδα, μαζί: αν κάτι δεν φορτώσει, δεν δείχνουμε μισές Ρυθμίσεις.
export async function AgreementsSettingsContent({
  showRetired,
}: {
  showRetired: boolean;
}) {
  const [kinds, usage, changes] = await Promise.all([
    listProvisionKinds(),
    getKindUsage(),
    recentChanges(["provision_kinds"]),
  ]);
  if (!kinds.ok || !usage.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσαν οι Ρυθμίσεις">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );
  return (
    <>
      <ProvisionKindsEditor
        kinds={kinds.data}
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
