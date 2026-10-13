import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  CONVERSATIONS_EYEBROW,
  CONVERSATIONS_LOAD_ERROR,
  CONVERSATIONS_TITLE,
  ConversationsScreen,
  LOAD_ERROR_TEXT,
  NO_CONVERSATIONS_ACCESS_TEXT,
  getConversations,
  parseAudienceTab,
  parseDone,
  parsePage,
} from "@/modules/knowledge";

export const metadata = { title: CONVERSATIONS_TITLE };

interface ConversationsPageProps {
  searchParams: Promise<{ tab?: string; page?: string; done?: string }>;
}

// L2 Συζητήσεις Βοηθού: μόνο με «Διαχειρίζεται Γνώση». Καρτέλα και σελίδα στη διεύθυνση.
export default async function ConversationsPage({
  searchParams,
}: ConversationsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const audience = parseAudienceTab(params.tab);
  const result =
    viewer.status === "signed-in"
      ? await getConversations(audience, parsePage(params.page))
      : null;
  return (
    <>
      <ScreenHeader
        eyebrow={CONVERSATIONS_EYEBROW}
        title={CONVERSATIONS_TITLE}
      />
      {result?.ok === false ? (
        <Notice kind="error" title={CONVERSATIONS_LOAD_ERROR}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : result?.data ? (
        <ConversationsScreen
          list={result.data}
          audience={audience}
          done={parseDone(params.done)}
        />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_CONVERSATIONS_ACCESS_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
