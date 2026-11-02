import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { AutoRefresh } from "../components/auto-refresh";
import type { ClientTab } from "../components/client-screen";
import { MESSAGES_PATH, newestAt } from "../helpers";
import {
  CLIENT_READONLY_NOTE,
  CLIENT_VIDEO_NOTE,
  clientDigestNote,
  clientEditFooter,
} from "../labels";
import { markThreadReadAfterRender } from "../mark-read";
import { getClientContext, getClientRequests, getThread } from "../queries";
import { timelineOf } from "../request-helpers";
import {
  CHANGE_TITLE,
  CLIENT_CHANGE_DONE,
  CLIENT_CHANGE_OPEN,
  CLIENT_DELIVERABLE_LINK,
  REQUEST_STATE_LABELS,
  changeAbout,
} from "../request-labels";
import type { ChangeRequest, ClientContext, Thread } from "../view-schema";
import { MessageBubble } from "./j-message";
import { ReadAtScope } from "./j2-read-at";
import { ClientMessageActions } from "./j3-actions";
import {
  j3ItemOf,
  j3RecipientOf,
  j3RequestRowsOf,
  type J3RequestRow,
} from "./j3-adapter";
import { J3Composer } from "./j3-composer";
import { J3LinkView, RequestBox } from "./j3-request-box";

import "./j.css";
import "./j3.css";

function Tabs({
  tab,
  openCount,
}: {
  tab: ClientTab;
  openCount: number | null;
}) {
  return (
    <nav className="tabs" aria-label="Μηνύματα">
      <Link
        className="tab"
        href={MESSAGES_PATH}
        aria-current={tab === "conversation" ? "page" : undefined}
      >
        Συνομιλία
      </Link>
      <Link
        className="tab"
        href={`${MESSAGES_PATH}?tab=requests`}
        aria-current={tab === "requests" ? "page" : undefined}
      >
        {openCount === null ? "Αιτήματα" : `Αιτήματα (${openCount} ανοιχτά)`}
      </Link>
    </nav>
  );
}

function RequestsTab({ rows }: { rows: readonly J3RequestRow[] }) {
  if (rows.length === 0)
    return (
      <StateNotice kind="empty" title="Δεν έχεις στείλει Αίτημα">
        <p>Όταν ζητήσεις κάτι από τη Συνομιλία, θα το βρεις εδώ.</p>
      </StateNotice>
    );
  return (
    <Panel label="Αιτήματα" aside={rows.length} isFlush>
      <RowList>
        {rows.map((row) => (
          <ListRow
            key={row.key}
            title={row.title}
            isFaded={row.isFaded}
            sub={
              <>
                <span className="part-sub">{row.when}</span>
                {row.about && <span className="part-sub">{row.about}</span>}
                {row.text && <span className="j3-req-text">{row.text}</span>}
                <RequestBox request={row.box} />
                {row.chatHref && (
                  <Link href={row.chatHref}>Δες στη Συνομιλία</Link>
                )}
                {row.deliverable && <J3LinkView link={row.deliverable} />}
              </>
            }
            aside={
              <Badge tone={row.box.isOpen ? "attention" : undefined}>
                {row.box.state}
              </Badge>
            }
          />
        ))}
      </RowList>
    </Panel>
  );
}

// Αίτημα αλλαγής μετά την έγκριση στη χρονική του θέση (Μ12): η απόφαση φαίνεται στο Παραδοτέο.
function ChangeBubble({ change }: { change: ChangeRequest }) {
  const isOpen = change.state === "open";
  return (
    <article
      className="jmsg"
      id={`cr-${change.id}`}
      data-side="client">
      <div className="j3-req">
        <div className="j3-req-head">
          <strong>{CHANGE_TITLE}</strong>
          <Badge tone={isOpen ? "attention" : undefined}>
            {REQUEST_STATE_LABELS[isOpen ? "open" : "done"]}
          </Badge>
        </div>
        <p className="muted">{changeAbout(change.deliverableTitle)}</p>
        <p className="j3-req-text">{change.body}</p>
        <p className="muted">
          {isOpen ? CLIENT_CHANGE_OPEN : CLIENT_CHANGE_DONE}
        </p>
        <Link href={`/app/deliverables/${change.deliverableId}`}>
          {CLIENT_DELIVERABLE_LINK}
        </Link>
      </div>
    </article>
  );
}

// Τα πιο πρόσφατα πάνω, ακριβώς κάτω από τη φόρμα (όπως στο prototype).
function Messages({ thread }: { thread: Thread }) {
  const entries = timelineOf(thread.messages, thread.changeRequests).reverse();
  return (
    <ReadAtScope readAt={thread.readAt}>
      {entries.map((entry) => {
        if (entry.type === "change")
          return <ChangeBubble key={entry.change.id} change={entry.change} />;
        const item = j3ItemOf(thread, entry.message);
        return (
          <MessageBubble
            key={item.message.id}
            message={item.message}
            isClientViewer
            isOwn={item.isOwn}
            actions={
              item.isOwn ? (
                <ClientMessageActions message={item.message} />
              ) : undefined
            }
          >
            {item.request && <RequestBox request={item.request} />}
          </MessageBubble>
        );
      })}
    </ReadAtScope>
  );
}

function Writer({
  context,
  thread,
}: {
  context: ClientContext;
  thread: Thread | null;
}) {
  if (thread?.canWrite)
    return (
      <J3Composer
        clientId={context.clientId}
        productions={thread.productions}
        recipient={j3RecipientOf(thread.client.managerName)}
      />
    );
  // Η σημείωση «μόνο Βλέπει Συνομιλία» μόνο όταν λείπει το Δικαίωμα (όχι π.χ. σε αρχειοθετημένο Πελάτη).
  if (context.canWrite) return null;
  return <p className="note">{CLIENT_READONLY_NOTE}</p>;
}

function ConversationTab({
  context,
  thread,
}: {
  context: ClientContext;
  thread: Thread | null;
}) {
  const isEmpty =
    thread === null ||
    (thread.messages.length === 0 && thread.changeRequests.length === 0);
  return (
    <div className="j3-thread">
      {isEmpty && (
        <StateNotice kind="empty" title="Καμία συζήτηση ακόμα">
          {thread?.canWrite && <p>Γράψε το πρώτο σου Μήνυμα στην ομάδα</p>}
        </StateNotice>
      )}
      <Writer context={context} thread={thread} />
      {thread && !isEmpty && <Messages thread={thread} />}
      {thread?.canWrite && (
        <p className="muted">{clientEditFooter(thread.editMinutes)}</p>
      )}
    </div>
  );
}

function Notes({ digestMinutes }: { digestMinutes: number | null }) {
  return (
    <Panel label="Ειδοποιήσεις">
      <p className="muted">{clientDigestNote(digestMinutes)}</p>
      <p className="muted">
        Αν ανήκεις σε περισσότερους Πελάτες, βλέπεις τη Συνομιλία του Πελάτη που
        έχεις επιλέξει.
      </p>
      <p className="muted">{CLIENT_VIDEO_NOTE}</p>
    </Panel>
  );
}

function LoadError() {
  return (
    <div data-spaces>
      <ErrorNotice what="τα Μηνύματα" />
    </div>
  );
}

// J3 Μηνύματα του Χρήστη πελάτη στη νέα εμφάνιση (prototype `screens/J3.tsx`): «Συνομιλία» και «Αιτήματα (N ανοιχτά)».
// Η βάση κρύβει Εσωτερικά, υπεύθυνο και αναφορές· χωρίς Δικαίωμα γραφής φαίνεται η σημείωση «μόνο ανάγνωση».
export async function SpacesClientMessages({ tab }: { tab: ClientTab }) {
  const context = await getClientContext();
  if (!context.ok || context.data === null) return <LoadError />;
  const requests = await getClientRequests();
  const openCount = requests.ok ? requests.data.openCount : null;
  if (tab === "requests")
    return (
      <div data-spaces>
        <AutoRefresh />
        <div className="j3-grid" id="top">
          <Tabs tab={tab} openCount={openCount} />
          {requests.ok ? (
            <RequestsTab rows={j3RequestRowsOf(requests.data.items)} />
          ) : (
            <ErrorNotice what="τα Αιτήματα" />
          )}
          <Notes digestMinutes={context.data.digestMinutes} />
        </div>
      </div>
    );
  const result = await getThread(context.data.clientId);
  if (!result.ok) return <LoadError />;
  const thread = result.data;
  if (thread !== null && thread.messages.length > 0)
    await markThreadReadAfterRender(
      context.data.clientId,
      newestAt(thread.messages),
    );
  return (
    <div data-spaces>
      <AutoRefresh />
      <div className="j3-grid" id="top">
        <Tabs tab={tab} openCount={openCount} />
        <ConversationTab context={context.data} thread={thread} />
        <Notes digestMinutes={context.data.digestMinutes} />
      </div>
    </div>
  );
}
