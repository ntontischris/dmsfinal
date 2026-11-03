import { lookOf } from "@/components/shell/read-look";
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
  messagesCaps,
  messagesViewOf,
  parseClientTab,
  parseJ3Order,
  parseRequestView,
  parseTab,
  SpacesClientMessages,
  SpacesInbox,
} from "@/modules/messages";

export const metadata = { title: INBOX_TITLE };

interface MessagesPageProps {
  searchParams: Promise<{ tab?: string; view?: string; order?: string }>;
}

// J1 για την ομάδα (Εισερχόμενα: «Συνομιλίες» και «Με ανέφεραν»), J3 για τον Χρήστη πελάτη με «Βλέπει Συνομιλία»,
// αλλιώς ενημέρωση (και για τον Λογιστή). Η βάση αποφασίζει ποιος βλέπει τι.
// Στη νέα εμφάνιση (Χώροι) οι οθόνες του prototype (J1 ή J3)· αλλιώς οι σημερινές.
export default async function MessagesPage({
  searchParams,
}: MessagesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const view = messagesViewOf(viewer);
  if ((await lookOf(viewer)) === "spaces")
    return view === "client" ? (
      <SpacesClientMessages
        tab={parseClientTab(params.tab)}
        order={parseJ3Order(params.order)}
      />
    ) : (
      <SpacesInbox
        tab={parseTab(params.tab)}
        view={parseRequestView(params.view)}
      />
    );
  if (view === "client") {
    return (
      <>
        <ScreenHeader eyebrow={CLIENT_EYEBROW} title={CLIENT_TITLE} />
        <ClientScreen tab={parseClientTab(params.tab)} />
      </>
    );
  }
  return (
    <>
      <ScreenHeader eyebrow={INBOX_EYEBROW} title={INBOX_TITLE} />
      {view === "team" ? (
        <InboxScreen
          tab={parseTab(params.tab)}
          view={parseRequestView(params.view)}
          canTransfer={messagesCaps(viewer).canTransfer}
        />
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
