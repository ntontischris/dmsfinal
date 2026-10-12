import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  AutomationsSubnav,
  K2_EYEBROW,
  LOAD_FAILED_TEXT,
  NO_MANAGE_TEXT,
  SETTINGS_TITLE,
  SystemMessageList,
  getSystemMessages,
} from "@/modules/notifications";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Μηνύματα συστήματος" };

// K2 Μηνύματα συστήματος (#173): πάντα ενεργά, αλλάζει μόνο το κείμενο. Μόνο όποιος «Διαχειρίζεται Αυτοματισμούς».
export default async function SystemMessagesPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow={K2_EYEBROW} title={SETTINGS_TITLE} />;
  if (!can(viewer, "automations.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_MANAGE_TEXT}</p>
        </AccessNotice>
      </>
    );

  const messages = await getSystemMessages();
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="automations" />
        <AutomationsSubnav current="system" />
        {messages.ok && messages.data ? (
          <SystemMessageList messages={messages.data} />
        ) : (
          <Notice kind="error" title="Δεν φόρτωσαν τα Μηνύματα συστήματος">
            <p className="m-0">{LOAD_FAILED_TEXT}</p>
          </Notice>
        )}
      </div>
    </>
  );
}
