import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  MessageSettingsForm,
  SpacesMessageSettings,
  getMessageSettings,
} from "@/modules/messages";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Μηνύματα" };

// Ρυθμίσεις › Μηνύματα: οι χρόνοι της Συνομιλίας. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
// Στη νέα εμφάνιση (Χώροι) με τα κοινά των Ρυθμίσεων του prototype· αλλιώς η σημερινή.
export default async function MessageSettingsPage() {
  const viewer = await getViewer();
  if ((await lookOf(viewer)) === "spaces") return <SpacesMessageSettings />;
  const header = <ScreenHeader eyebrow="Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!can(viewer, "settings.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
          </p>
        </AccessNotice>
      </>
    );

  const settings = await getMessageSettings();
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="messages" />
        {settings.ok ? (
          <MessageSettingsForm settings={settings.data} canManageAutomations={can(viewer, "automations.manage")} />
        ) : (
          <Notice kind="error" title="Δεν φόρτωσαν οι Ρυθμίσεις">
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        )}
      </div>
    </>
  );
}
