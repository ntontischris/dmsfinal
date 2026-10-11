import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  CLIENT_EYEBROW,
  CLIENT_NO_ACCESS_TEXT,
  CLIENT_TITLE,
  ClientScreen,
  INBOX_EYEBROW,
  INBOX_NO_ACCESS_TEXT,
  INBOX_TITLE,
  InboxScreen,
  messagesViewOf,
  parseTab,
} from "@/modules/messages";

export const metadata = { title: INBOX_TITLE };

interface MessagesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

// J1 για την ομάδα (Εισερχόμενα: «Συνομιλίες» και «Με ανέφεραν»), J3 για τον Χρήστη πελάτη με «Βλέπει Συνομιλία»,
// αλλιώς ενημέρωση (και για τον Λογιστή). Η βάση αποφασίζει ποιος βλέπει τι.
export default async function MessagesPage({
  searchParams,
}: MessagesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const view = messagesViewOf(viewer);
  if (view === "client") {
    return (
      <>
        <ScreenHeader eyebrow={CLIENT_EYEBROW} title={CLIENT_TITLE} />
        <ClientScreen />
      </>
    );
  }
  return (
    <>
      <ScreenHeader eyebrow={INBOX_EYEBROW} title={INBOX_TITLE} />
      {view === "team" ? (
        <InboxScreen tab={parseTab(params.tab)} />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            {viewer.status === "signed-in" && viewer.team === null
              ? CLIENT_NO_ACCESS_TEXT
              : INBOX_NO_ACCESS_TEXT}
          </p>
        </AccessNotice>
      )}
    </>
  );
}
