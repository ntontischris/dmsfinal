import { getViewer } from "@/modules/access";
import {
  CLIENT_NO_ACCESS_TEXT,
  INBOX_TITLE,
  messagesViewOf,
  parseClientTab,
  parseJ3Order,
  parseRequestView,
  parseTab,
  SpacesClientMessages,
  SpacesInbox,
} from "@/modules/messages";
import { StateNotice } from "@/spaces/screens/shared";

export const metadata = { title: INBOX_TITLE };

interface MessagesPageProps {
  searchParams: Promise<{ tab?: string; view?: string; order?: string }>;
}

// J1 για την ομάδα (Εισερχόμενα: «Συνομιλίες», «Αιτήματα», «Με ανέφεραν»), J3 για τον Χρήστη πελάτη με «Βλέπει Συνομιλία».
// Ο λογαριασμός χωρίς ομάδα (π.χ. πελάτη χωρίς «Βλέπει Συνομιλία») βλέπει γιατί δεν έχει πρόσβαση· η βάση αποφασίζει ποιος βλέπει τι.
export default async function MessagesPage({
  searchParams,
}: MessagesPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const view = messagesViewOf(viewer);
  if (view === "client")
    return (
      <SpacesClientMessages
        tab={parseClientTab(params.tab)}
        order={parseJ3Order(params.order)}
      />
    );
  if (view === "none" && viewer.status === "signed-in" && viewer.team === null)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {CLIENT_NO_ACCESS_TEXT}
        </StateNotice>
      </div>
    );
  return (
    <SpacesInbox
      tab={parseTab(params.tab)}
      view={parseRequestView(params.view)}
    />
  );
}
