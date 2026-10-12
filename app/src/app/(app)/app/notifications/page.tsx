import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, isClientViewer } from "@/modules/access";
import {
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  LanguageForm,
  NO_ACCESS_TEXT,
  NOTIFICATIONS_EYEBROW,
  NOTIFICATIONS_TITLE,
  NotificationsScreen,
  getMyLanguage,
  getNotifications,
  parseCursor,
  parseFilter,
} from "@/modules/notifications";

export const metadata = { title: NOTIFICATIONS_TITLE };

interface NotificationsPageProps {
  searchParams: Promise<{ show?: string; before?: string; beforeId?: string }>;
}

// A2 για όλους (ομάδα και πελάτη): η βάση δείχνει μόνο τις δικές σου Ειδοποιήσεις.
// Ο Χρήστης πελάτη διαλέγει εδώ και τη γλώσσα των email του (#171).
export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const filter = parseFilter(params.show);
  const isSignedIn = viewer.status === "signed-in";
  const [result, language] = await Promise.all([
    isSignedIn
      ? getNotifications(filter, parseCursor(params.before, params.beforeId))
      : null,
    isClientViewer(viewer) ? getMyLanguage() : null,
  ]);
  return (
    <>
      <ScreenHeader
        eyebrow={NOTIFICATIONS_EYEBROW}
        title={NOTIFICATIONS_TITLE}
      />
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
      {language?.ok && language.data && (
        <LanguageForm current={language.data} />
      )}
    </>
  );
}
