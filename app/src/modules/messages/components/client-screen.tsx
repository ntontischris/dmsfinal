import { Notice } from "@/components/ui/notice";

import { newestAt } from "../helpers";
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
import { getClientContext, getThread } from "../queries";
import type { ClientContext, Thread } from "../view-schema";
import { AutoRefresh } from "./auto-refresh";
import { ClientComposer } from "./client-composer";
import { MessageItem } from "./message-item";
import { ReadAtScope } from "./new-mark";

const DEFAULT_EDIT_MINUTES = 15;

function LoadError() {
  return (
    <Notice kind="error" title={CLIENT_ERROR_TITLE}>
      <p className="m-0">{CLIENT_ERROR_TEXT}</p>
    </Notice>
  );
}

function EmptyConversation() {
  return (
    <Notice kind="empty" title={CLIENT_EMPTY_TITLE}>
      <p className="m-0">{CLIENT_EMPTY_TEXT}</p>
    </Notice>
  );
}

function ClientMessages({ thread }: { thread: Thread }) {
  if (thread.messages.length === 0) return <EmptyConversation />;
  return (
    <ReadAtScope readAt={thread.readAt}>
      <div className="grid gap-3">
        {thread.messages.map((message) => (
          <MessageItem
            key={message.id}
            clientId={thread.client.id}
            message={message}
            productions={thread.productions}
            canClearTag={false}
            isTeamViewer={false}
          />
        ))}
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

// Μία καρτέλα σήμερα· η «Αιτήματα (N ανοιχτά)» προστίθεται εδώ στο Jδ.
function Tabs() {
  return (
    <nav aria-label={CLIENT_TABS_LABEL} className="flex gap-2">
      <span
        aria-current="page"
        className="rounded-sm border border-primary px-3 py-1 text-sm font-semibold"
      >
        {CLIENT_TAB_CONVERSATION}
      </span>
    </nav>
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
  return (
    <p className="m-0 rounded-md border bg-muted px-4 py-3 text-sm">
      {CLIENT_READONLY_NOTE}
    </p>
  );
}

// J3: η Συνομιλία του Χρήστη πελάτη με την ομάδα. Η βάση κρύβει Εσωτερικά, υπεύθυνο και αναφορές· εδώ μόνο Μ2 και Μ3.
// Χωρίς ορατά Μηνύματα και χωρίς Δικαίωμα γραφής η βάση δίνει 42501 (null)· για τον πελάτη αυτό είναι άδεια Συνομιλία.
export async function ClientScreen() {
  const context = await getClientContext();
  if (!context.ok || context.data === null) return <LoadError />;
  const result = await getThread(context.data.clientId);
  if (!result.ok) return <LoadError />;
  const thread = result.data;
  if (thread !== null && thread.messages.length > 0) {
    await markThreadReadAfterRender(
      context.data.clientId,
      newestAt(thread.messages),
    );
  }
  return (
    <>
      <AutoRefresh />
      <div className="grid gap-4">
        <Tabs />
        {thread ? <ClientMessages thread={thread} /> : <EmptyConversation />}
        <Composer context={context.data} thread={thread} />
        <p className="m-0 text-sm text-muted-foreground">
          {clientEditFooter(thread?.editMinutes ?? DEFAULT_EDIT_MINUTES)}
        </p>
        <Notes digestMinutes={context.data.digestMinutes} />
      </div>
    </>
  );
}
