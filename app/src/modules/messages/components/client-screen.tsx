import { Notice } from "@/components/ui/notice";
import { Tabs } from "@/components/ui/segmented";

import { MESSAGES_PATH, newestAt } from "../helpers";
import {
  CLIENT_EMPTY_TEXT,
  CLIENT_EMPTY_TITLE,
  CLIENT_ERROR_TEXT,
  CLIENT_ERROR_TITLE,
  CLIENT_NOTES_TITLE,
  CLIENT_READONLY_NOTE,
  CLIENT_TABS_LABEL,
  CLIENT_TAB_CONVERSATION,
  CLIENT_VIDEO_NOTE,
  clientDigestNote,
  clientEditFooter,
} from "../labels";
import { markThreadReadAfterRender } from "../mark-read";
import { getClientContext, getClientRequests, getThread } from "../queries";
import { timelineOf } from "../request-helpers";
import { CLIENT_TAB_REQUESTS, TAB_REQUESTS } from "../request-labels";
import type { ClientContext, Thread } from "../view-schema";
import { AutoRefresh } from "./auto-refresh";
import { ChangeRequestItem } from "./change-request-item";
import { ClientComposer } from "./client-composer";
import { ClientRequestsList } from "./client-requests";
import { MessageItem } from "./message-item";
import { ReadAtScope } from "./new-mark";
import { RequestBox } from "./request-box";

function LoadError() {
  return (
    <Notice kind="error" title={CLIENT_ERROR_TITLE}>
      <p className="m-0">{CLIENT_ERROR_TEXT}</p>
    </Notice>
  );
}

// «Γράψε το πρώτο σου Μήνυμα» μόνο σε όποιον μπορεί να γράψει.
function EmptyConversation({ canWrite }: { canWrite: boolean }) {
  return (
    <Notice kind="empty" title={CLIENT_EMPTY_TITLE}>
      {canWrite && <p className="m-0">{CLIENT_EMPTY_TEXT}</p>}
    </Notice>
  );
}

function ClientMessages({ thread }: { thread: Thread }) {
  if (thread.messages.length === 0 && thread.changeRequests.length === 0) {
    return <EmptyConversation canWrite={thread.canWrite} />;
  }
  return (
    <ReadAtScope readAt={thread.readAt}>
      <div className="grid gap-3">
        {timelineOf(thread.messages, thread.changeRequests).map((entry) =>
          entry.type === "change" ? (
            <ChangeRequestItem key={entry.change.id} change={entry.change} isTeamViewer={false} />
          ) : (
            <MessageItem
              key={entry.message.id}
              clientId={thread.client.id}
              message={entry.message}
              productions={thread.productions}
              canClearTag={false}
              isTeamViewer={false}
              requestBox={
                entry.message.request && (
                  <RequestBox request={entry.message.request} isTeamViewer={false} isMine={entry.message.mine} />
                )
              }
            />
          ),
        )}
      </div>
    </ReadAtScope>
  );
}

function Notes({ digestMinutes }: { digestMinutes: number }) {
  return (
    <section className="grid gap-2 rounded-md border bg-card px-4 py-3">
      <h2 className="m-0 text-base font-semibold">{CLIENT_NOTES_TITLE}</h2>
      <p className="m-0 text-sm text-muted-foreground">
        {clientDigestNote(digestMinutes)}
      </p>
      <p className="m-0 text-sm text-muted-foreground">{CLIENT_VIDEO_NOTE}</p>
    </section>
  );
}

export type ClientTab = "conversation" | "requests";

export const parseClientTab = (value: string | undefined): ClientTab => (value === "requests" ? "requests" : "conversation");

// «Συνομιλία» και «Αιτήματα (N ανοιχτά)». Ο αριθμός είναι το πλήθος των ανοιχτών Αιτημάτων του πελάτη.
function ClientTabs({ tab, openCount }: { tab: ClientTab; openCount: number | null }) {
  return (
    <Tabs
      label={CLIENT_TABS_LABEL}
      options={[
        { label: CLIENT_TAB_CONVERSATION, href: MESSAGES_PATH, isCurrent: tab === "conversation" },
        {
          label: openCount === null ? TAB_REQUESTS : CLIENT_TAB_REQUESTS(openCount),
          href: `${MESSAGES_PATH}?tab=requests`,
          isCurrent: tab === "requests",
        },
      ]}
    />
  );
}

function Composer({
  context,
  thread,
}: {
  context: ClientContext;
  thread: Thread | null;
}) {
  if (thread?.canWrite) {
    return (
      <ClientComposer
        clientId={context.clientId}
        productions={thread.productions}
      />
    );
  }
  // Η σημείωση «μόνο Βλέπει Συνομιλία» μόνο όταν λείπει το Δικαίωμα (όχι π.χ. σε αρχειοθετημένο Πελάτη).
  if (context.canWrite) return null;
  return (
    <p className="m-0 rounded-md border bg-muted px-4 py-3 text-sm">
      {CLIENT_READONLY_NOTE}
    </p>
  );
}

function ConversationTab({ context, thread }: { context: ClientContext; thread: Thread | null }) {
  return (
    <>
      {thread ? <ClientMessages thread={thread} /> : <EmptyConversation canWrite={false} />}
      <Composer context={context} thread={thread} />
      {thread?.canWrite && (
        <p className="m-0 text-sm text-muted-foreground">{clientEditFooter(thread.editMinutes)}</p>
      )}
      <Notes digestMinutes={context.digestMinutes} />
    </>
  );
}

// J3: η Συνομιλία του Χρήστη πελάτη με την ομάδα και η καρτέλα Αιτημάτων. Η βάση κρύβει Εσωτερικά, υπεύθυνο και αναφορές·
// εδώ μόνο Μ2 και Μ3. Χωρίς ορατά Μηνύματα και χωρίς Δικαίωμα γραφής η βάση δίνει 42501 (null)· για τον πελάτη αυτό είναι άδεια Συνομιλία.
export async function ClientScreen({ tab }: { tab: ClientTab }) {
  const context = await getClientContext();
  if (!context.ok || context.data === null) return <LoadError />;
  const requests = await getClientRequests();
  const openCount = requests.ok ? requests.data.openCount : null;
  if (tab === "requests") {
    return (
      <>
        <AutoRefresh />
        <div className="grid gap-4">
          <ClientTabs tab={tab} openCount={openCount} />
          {requests.ok ? <ClientRequestsList items={requests.data.items} /> : <LoadError />}
        </div>
      </>
    );
  }
  const result = await getThread(context.data.clientId);
  if (!result.ok) return <LoadError />;
  const thread = result.data;
  if (thread !== null && thread.messages.length > 0) {
    await markThreadReadAfterRender(context.data.clientId, newestAt(thread.messages));
  }
  return (
    <>
      <AutoRefresh />
      <div className="grid gap-4">
        <ClientTabs tab={tab} openCount={openCount} />
        <ConversationTab context={context.data} thread={thread} />
      </div>
    </>
  );
}
