import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  SENDS_EYEBROW,
  SENDS_LOAD_ERROR_TEXT,
  SENDS_LOAD_ERROR_TITLE,
  SENDS_NO_ACCESS,
  SENDS_TITLE,
  SendsScreen,
  getSends,
  parseSendsChannel,
  parseSendsClient,
  parseSendsCursor,
  parseSendsTab,
  sendsCaps,
} from "@/modules/notifications";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: SENDS_TITLE };

interface SendsPageProps {
  searchParams: Promise<{
    tab?: string;
    channel?: string;
    client?: string;
    before?: string;
    beforeId?: string;
  }>;
}

// K3 Ιστορικό αποστολών (#174): για όποιον «Διαχειρίζεται Αυτοματισμούς» ή «Βλέπει Υγεία συστήματος». Η βάση το ξανακρίνει.
export default async function SendsPage({ searchParams }: SendsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const caps = sendsCaps(viewer);
  const header = <ScreenHeader eyebrow={SENDS_EYEBROW} title={SENDS_TITLE} />;
  if (!caps.canView)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{SENDS_NO_ACCESS}</p>
        </AccessNotice>
      </>
    );

  const query = {
    tab: parseSendsTab(params.tab),
    channel: parseSendsChannel(params.channel),
    client: parseSendsClient(params.client),
    cursor: parseSendsCursor(params.before, params.beforeId),
  };
  const result = await getSends(query);
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="sends" />
        {result.ok && result.data ? (
          <SendsScreen page={result.data} query={query} canRetry={caps.canRetry} />
        ) : result.ok ? (
          <AccessNotice viewer={viewer}>
            <p className="m-0">{SENDS_NO_ACCESS}</p>
          </AccessNotice>
        ) : (
          <Notice kind="error" title={SENDS_LOAD_ERROR_TITLE}>
            <p className="m-0">{SENDS_LOAD_ERROR_TEXT}</p>
          </Notice>
        )}
      </div>
    </>
  );
}
