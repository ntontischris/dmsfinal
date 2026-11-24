import Link from "next/link";

import { ErrorNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { AutoRefresh } from "../components/auto-refresh";
import { chatTopicOf } from "../components/refresh-mode";
import { MESSAGES_PATH, newestAt, type ClientTab } from "../helpers";
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
import { JEmpty } from "./j-empty";
import { MessageBubble } from "./j-message";
import { ReadAtScope } from "./j2-read-at";
import { ClientMessageActions } from "./j3-actions";
import {
  j3ItemOf,
  j3OrderHrefOf,
  j3RecipientOf,
  j3RequestRowsOf,
  orderedOf,
  type J3Order,
  type J3RequestRow,
} from "./j3-adapter";
import { J3Composer } from "./j3-composer";
import { J3LinkView, RequestBox } from "./j3-request-box";

import "../../finance/spaces/money-lines.css";
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
    <nav className="page-filters" aria-label="Μηνύματα">
      <Link
        href={MESSAGES_PATH}
        aria-current={tab === "conversation" ? "page" : undefined}
      >
        Συνομιλία
      </Link>
      <Link
        href={`${MESSAGES_PATH}?tab=requests`}
        aria-current={tab === "requests" ? "page" : undefined}
      >
        {openCount === null ? "Αιτήματα" : `Αιτήματα (${openCount} ανοιχτά)`}
      </Link>
    </nav>
  );
}

function RequestLine({ row }: { row: J3RequestRow }) {
  return (
    <li className="ml-line" data-faded={row.isFaded || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(row.title)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">{row.box.state}</span>
        <strong>{row.title}</strong>
        <small>
          {row.when}
          {row.about && ` · ${row.about}`}
        </small>
        {row.text && <span className="j3-req-text">{row.text}</span>}
        <RequestBox request={row.box} />
      </span>
      <span aria-hidden="true" />
      {(row.chatHref || row.deliverable) && (
        <span className="ml-quick">
          {row.chatHref && <Link href={row.chatHref}>Δες στη Συνομιλία</Link>}
          {row.deliverable && <J3LinkView link={row.deliverable} />}
        </span>
      )}
    </li>
  );
}

function RequestsTab({ rows }: { rows: readonly J3RequestRow[] }) {
  if (rows.length === 0)
    return (
      <JEmpty title="Δεν έχεις στείλει Αίτημα">
        <p>Όταν ζητήσεις κάτι από τη Συνομιλία, θα το βρεις εδώ.</p>
      </JEmpty>
    );
  return (
    <ul className="ml-list" aria-label="Αιτήματα">
      {rows.map((row) => (
        <RequestLine key={row.key} row={row} />
      ))}
    </ul>
  );
}

// Αίτημα αλλαγής μετά την έγκριση στη χρονική του θέση (Μ12): η απόφαση φαίνεται στο Παραδοτέο.
function ChangeBubble({ change }: { change: ChangeRequest }) {
  const isOpen = change.state === "open";
  return (
    <article className="jmsg" id={`cr-${change.id}`} data-side="client">
      <div className="j3-req">
        <div className="j3-req-head">
          <strong>{CHANGE_TITLE}</strong>
          <span className="ml-tag">
            {REQUEST_STATE_LABELS[isOpen ? "open" : "done"]}
          </span>
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

// Νεότερα πρώτα: τα πιο πρόσφατα πάνω, κάτω από τη φόρμα (prototype). Παλαιότερα πρώτα: χρονολογικά (σημερινή οθόνη).
function Messages({ thread, order }: { thread: Thread; order: J3Order }) {
  const entries = orderedOf(
    timelineOf(thread.messages, thread.changeRequests),
    order,
  );
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

function OrderToggle({ order }: { order: J3Order }) {
  return (
    <nav className="page-filters" aria-label="Σειρά Μηνυμάτων">
      {(["new", "old"] as const).map((option) => (
        <Link
          key={option}
          href={j3OrderHrefOf(option, MESSAGES_PATH)}
          scroll={false}
          aria-current={option === order ? "page" : undefined}
        >
          {option === "new" ? "Νεότερα πρώτα" : "Παλαιότερα πρώτα"}
        </Link>
      ))}
    </nav>
  );
}

function ConversationTab({
  context,
  thread,
  order,
}: {
  context: ClientContext;
  thread: Thread | null;
  order: J3Order;
}) {
  const isEmpty =
    thread === null ||
    (thread.messages.length === 0 && thread.changeRequests.length === 0);
  const writer = <Writer context={context} thread={thread} />;
  return (
    <div className="j3-thread">
      {isEmpty && (
        <JEmpty title="Καμία συζήτηση ακόμα">
          {thread?.canWrite && <p>Γράψε το πρώτο σου Μήνυμα στην ομάδα</p>}
        </JEmpty>
      )}
      {!isEmpty && <OrderToggle order={order} />}
      {order === "new" && writer}
      {thread && !isEmpty && <Messages thread={thread} order={order} />}
      {order === "old" && writer}
      {thread?.canWrite && (
        <p className="muted">{clientEditFooter(thread.editMinutes)}</p>
      )}
    </div>
  );
}

function Notes({ digestMinutes }: { digestMinutes: number | null }) {
  return (
    <details className="ml-box">
      <summary>
        <span className="ml-box-title">Πώς λειτουργούν τα Μηνύματα</span>
        <small>ειδοποιήσεις, πολλοί Πελάτες, βίντεο</small>
      </summary>
      <p className="muted">{clientDigestNote(digestMinutes)}</p>
      <p className="muted">
        Αν ανήκεις σε περισσότερους Πελάτες, βλέπεις τη Συνομιλία του Πελάτη που
        έχεις επιλέξει.
      </p>
      <p className="muted">{CLIENT_VIDEO_NOTE}</p>
    </details>
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
export async function SpacesClientMessages({
  tab,
  order,
}: {
  tab: ClientTab;
  order: J3Order;
}) {
  const context = await getClientContext();
  if (!context.ok || context.data === null) return <LoadError />;
  const requests = await getClientRequests();
  const openCount = requests.ok ? requests.data.openCount : null;
  if (tab === "requests")
    return (
      <div data-spaces>
        <AutoRefresh topic={chatTopicOf("client", context.data.clientId)} />
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
      <AutoRefresh topic={chatTopicOf("client", context.data.clientId)} />
      <div className="j3-grid" id="top">
        <Tabs tab={tab} openCount={openCount} />
        <ConversationTab context={context.data} thread={thread} order={order} />
        <Notes digestMinutes={context.data.digestMinutes} />
      </div>
    </div>
  );
}
