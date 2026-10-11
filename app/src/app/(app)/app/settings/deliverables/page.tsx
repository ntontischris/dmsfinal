import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  DeliverableRulesForm,
  getDeliverableRules,
} from "@/modules/deliverables";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Παραδοτέα" };

// Ρυθμίσεις › Παραδοτέα: οι Κανόνες Παραδοτέων. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function DeliverableSettingsPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!can(viewer, "settings.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».</p>
        </AccessNotice>
      </>
    );

  const rules = await getDeliverableRules();
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="deliverables" />
        {rules.ok ? (
          <DeliverableRulesForm rules={rules.data} />
        ) : (
          <Notice kind="error" title="Δεν φόρτωσαν οι Κανόνες">
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        )}
      </div>
    </>
  );
}
