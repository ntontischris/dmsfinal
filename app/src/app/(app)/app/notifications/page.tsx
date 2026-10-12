import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  NO_ACCESS_TEXT,
  NOTIFICATIONS_EYEBROW,
  NOTIFICATIONS_TITLE,
  NotificationsScreen,
  getNotifications,
  parseBefore,
  parseFilter,
} from "@/modules/notifications";

export const metadata = { title: NOTIFICATIONS_TITLE };

interface NotificationsPageProps {
  searchParams: Promise<{ show?: string; before?: string }>;
}

// A2 για όλους (ομάδα και πελάτη): η βάση δείχνει μόνο τις δικές σου Ειδοποιήσεις.
export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const filter = parseFilter(params.show);
  const result =
    viewer.status === "signed-in"
      ? await getNotifications(filter, parseBefore(params.before))
      : null;
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
    </>
  );
}
