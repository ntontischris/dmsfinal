import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { SYSTEM_DEFAULTS } from "@/lib/email/system-defaults";
import { isSystemMessageCode } from "@/lib/email/system-texts";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  ALL_SYSTEM_MESSAGES,
  AutomationsSubnav,
  K2_EYEBROW,
  LOAD_FAILED_TEXT,
  NO_MANAGE_TEXT,
  SETTINGS_TITLE,
  SYSTEM_MESSAGES_PATH,
  SYSTEM_NO_SWITCH,
  SystemMessageBadges,
  SystemMessageEditor,
  editedLine,
  getSystemMessages,
} from "@/modules/notifications";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Μηνύματα συστήματος" };

interface SystemMessagePageProps {
  params: Promise<{ code: string }>;
}

// K2: ο editor ενός Μηνύματος συστήματος.
export default async function SystemMessagePage({
  params,
}: SystemMessagePageProps) {
  const [viewer, { code }] = await Promise.all([getViewer(), params]);
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

  const messages = isSystemMessageCode(code) ? await getSystemMessages() : null;
  const message = messages?.ok
    ? messages.data?.find((item) => item.code === code)
    : undefined;
  const defaults = isSystemMessageCode(code) ? SYSTEM_DEFAULTS[code] : null;
  const edited = message ? editedLine(message) : null;
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="automations" />
        <AutomationsSubnav current="system" />
        <p className="m-0">
          <Link href={SYSTEM_MESSAGES_PATH}>← {ALL_SYSTEM_MESSAGES}</Link>
        </p>
        {messages?.ok === false ? (
          <Notice kind="error" title="Δεν φόρτωσαν τα Μηνύματα συστήματος">
            <p className="m-0">{LOAD_FAILED_TEXT}</p>
          </Notice>
        ) : message && defaults ? (
          <>
            <Panel
              label={defaults.title}
              aside={<SystemMessageBadges message={message} />}
            >
              <div className="grid gap-2 text-sm">
                <p className="m-0 text-muted-foreground">{defaults.when}</p>
                <p className="m-0 text-muted-foreground">{defaults.note}</p>
                {edited && (
                  <p className="m-0 text-muted-foreground">{edited}</p>
                )}
                <p className="m-0">{SYSTEM_NO_SWITCH}</p>
              </div>
            </Panel>
            <SystemMessageEditor
              key={message.isEdited ? "edited" : message.updatedAt}
              message={message}
              defaults={defaults}
            />
          </>
        ) : (
          <Notice kind="empty" title="Δεν υπάρχει αυτό το Μήνυμα συστήματος">
            <Link href={SYSTEM_MESSAGES_PATH}>{ALL_SYSTEM_MESSAGES}</Link>
          </Notice>
        )}
      </div>
    </>
  );
}
