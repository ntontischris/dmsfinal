import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer, isClientViewer } from "@/modules/access";
import {
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  LanguageForm,
  NO_ACCESS_TEXT,
  NOTIFICATIONS_EYEBROW,
  NOTIFICATIONS_TITLE,
  NotificationsScreen,
  NotificationsTabs,
  PREFS_FAILED_TITLE,
  PrefsTab,
  getMyLanguage,
  getNotifications,
  getPrefs,
  parseCursor,
  parseFilter,
} from "@/modules/notifications";

export const metadata = { title: NOTIFICATIONS_TITLE };

interface NotificationsPageProps {
  searchParams: Promise<{ show?: string; before?: string; beforeId?: string; tab?: string }>;
}

// A2 για όλους (ομάδα και πελάτη): η βάση δείχνει μόνο τις δικές σου Ειδοποιήσεις.
// Καρτέλες «Εισερχόμενα» και «Προτιμήσεις» (#173)· στις Προτιμήσεις ο Χρήστης πελάτη διαλέγει και τη γλώσσα των email του.
export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const header = (
    <ScreenHeader eyebrow={NOTIFICATIONS_EYEBROW} title={NOTIFICATIONS_TITLE} />
  );
  if (params.tab === "prefs") {
    const isClient = isClientViewer(viewer);
    const [prefs, language] = await Promise.all([
      viewer.status === "signed-in" ? getPrefs() : null,
      isClient ? getMyLanguage() : null,
    ]);
    return (
      <>
        {header}
        <NotificationsTabs current="prefs" />
        {prefs?.ok === false ? (
          <Notice kind="error" title={PREFS_FAILED_TITLE}>
            <p className="m-0">{LOAD_ERROR_TEXT}</p>
          </Notice>
        ) : prefs?.data ? (
          <PrefsTab
            prefs={prefs.data}
            isClient={isClient}
            canConfigure={can(viewer, "automations.manage")}
            language={language?.ok && language.data ? <LanguageForm current={language.data} /> : null}
          />
        ) : (
          <AccessNotice viewer={viewer}>
            <p className="m-0">{NO_ACCESS_TEXT}</p>
          </AccessNotice>
        )}
      </>
    );
  }
  const filter = parseFilter(params.show);
  const result =
    viewer.status === "signed-in"
      ? await getNotifications(filter, parseCursor(params.before, params.beforeId))
      : null;
  return (
    <>
      {header}
      <NotificationsTabs current="inbox" />
      {result?.ok === false ? (
        <Notice kind="error" title={LOAD_ERROR_TITLE}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : result?.data ? (
        <NotificationsScreen
          page={result.data}
          filter={filter}
          now={new Date()}
        />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_ACCESS_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
