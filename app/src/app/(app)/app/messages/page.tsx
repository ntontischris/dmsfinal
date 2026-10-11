import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  INBOX_EYEBROW,
  INBOX_NO_ACCESS_TEXT,
  INBOX_TITLE,
  InboxScreen,
  messagesCaps,
  parseTab,
} from "@/modules/messages";

export const metadata = { title: INBOX_TITLE };

interface MessagesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

// J1: τα Εισερχόμενα της ομάδας («Συνομιλίες» και «Με ανέφεραν»). Ο Χρήστης πελάτη και ο Λογιστής βλέπουν ενημέρωση·
// η όψη πελάτη έρχεται στο Jβ. Η βάση αποφασίζει ποιος βλέπει τι.
export default async function MessagesPage({
  searchParams,
}: MessagesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const caps = messagesCaps(viewer);
  return (
    <>
      <ScreenHeader eyebrow={INBOX_EYEBROW} title={INBOX_TITLE} />
      {caps.canChat ? (
        <InboxScreen tab={parseTab(params.tab)} />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{INBOX_NO_ACCESS_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
