import Link from "next/link";

import { getViewer } from "@/modules/access";
import { getSpaceStrip } from "@/modules/today";
import { codesOfSpace } from "@/spaces/data/spaces";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { messagesCaps } from "../caps";
import {
  MESSAGES_PATH,
  threadHref,
  unreadTotal,
  type InboxTab,
} from "../helpers";
import {
  CONVERSATIONS_EMPTY_TEXT,
  CONVERSATIONS_EMPTY_TITLE,
  INBOX_NO_ACCESS_TEXT,
  MENTIONS_EMPTY_TEXT,
  MENTIONS_EMPTY_TITLE,
  MENTIONS_NOTE,
  SCOPE_NOTE,
  UNREAD_NOTE,
} from "../labels";
import {
  getInbox,
  getMentions,
  getRequestsView,
  getWritableClients,
} from "../queries";
import {
  allowedView,
  visibleViews,
  type RequestView,
} from "../request-helpers";
import {
  ASSIGNMENT_NOTE,
  REQUESTS_EMPTY,
  UNASSIGNED_NOTE,
} from "../request-labels";
import type { Inbox, RequestsView } from "../view-schema";
import {
  j1ConversationsOf,
  j1MentionsOf,
  j1RequestsOf,
  tabLabelOf,
} from "./j1-adapter";
import { ConversationList, MentionList } from "./j1-lists";
import { NewMessage } from "./j1-new";
import { RequestList, ViewLinks } from "./j1-requests";

import "./j.css";
import "./j1.css";

interface SpacesInboxProps {
  tab: InboxTab;
  view: RequestView;
}

const TAB_HREF: Readonly<Record<InboxTab, string>> = {
  conversations: MESSAGES_PATH,
  requests: `${MESSAGES_PATH}?tab=requests`,
  mentions: `${MESSAGES_PATH}?tab=mentions`,
};

function Tabs({
  tab,
  inbox,
  requestsMine,
}: {
  tab: InboxTab;
  inbox: Inbox;
  requestsMine: number | null;
}) {
  const labels: Readonly<Record<InboxTab, string>> = {
    conversations: tabLabelOf("Συνομιλίες", unreadTotal(inbox.items)),
    requests: tabLabelOf("Αιτήματα", requestsMine),
    mentions: tabLabelOf("Με ανέφεραν", inbox.mentionsUnread),
  };
  return (
    <nav className="tabs" aria-label="Εισερχόμενα">
      {(Object.keys(labels) as InboxTab[]).map((t) => (
        <Link
          key={t}
          className="tab"
          aria-current={t === tab ? "page" : undefined}
          href={TAB_HREF[t]}
        >
          {labels[t]}
        </Link>
      ))}
    </nav>
  );
}

async function ConversationsTab({
  inbox,
  open,
}: {
  inbox: Inbox;
  open: RequestsView | null;
}) {
  const writable = await getWritableClients();
  const rows = j1ConversationsOf(inbox.items, open?.items ?? null);
  return (
    <>
      {writable.ok && (
        <NewMessage
          options={writable.data.map((client) => ({
            id: client.id,
            name: client.name,
            href: threadHref(client.id),
          }))}
        />
      )}
      {rows.length > 0 ? (
        <ConversationList rows={rows} />
      ) : (
        <StateNotice kind="empty" title={CONVERSATIONS_EMPTY_TITLE}>
          {CONVERSATIONS_EMPTY_TEXT}
        </StateNotice>
      )}
      <p className="note">{UNREAD_NOTE}</p>
      <p className="note">{SCOPE_NOTE}</p>
    </>
  );
}

function RequestsTab({
  data,
  view,
  canTransfer,
}: {
  data: RequestsView;
  view: RequestView;
  canTransfer: boolean;
}) {
  const items = j1RequestsOf(data.items);
  return (
    <>
      <ViewLinks
        views={visibleViews({ canReassign: canTransfer, solo: data.solo })}
        view={view}
      />
      {view === "unassigned" && <p className="note">{UNASSIGNED_NOTE}</p>}
      {items.length > 0 ? (
        <RequestList items={items} />
      ) : (
        <StateNotice kind="empty" title={REQUESTS_EMPTY[view]} />
      )}
      <p className="note">{ASSIGNMENT_NOTE}</p>
    </>
  );
}

async function MentionsTab() {
  const mentions = await getMentions();
  if (!mentions.ok) return <ErrorNotice what="οι αναφορές" />;
  const items = j1MentionsOf(mentions.data);
  return (
    <>
      {items.length > 0 ? (
        <MentionList items={items} />
      ) : (
        <StateNotice kind="empty" title={MENTIONS_EMPTY_TITLE}>
          {MENTIONS_EMPTY_TEXT}
        </StateNotice>
      )}
      <p className="note">{MENTIONS_NOTE}</p>
    </>
  );
}

// Η όψη Αιτημάτων που χρειάζεται κάθε καρτέλα: η επιλεγμένη στα Αιτήματα, τα «όλα τα ανοιχτά» στις Συνομιλίες (για τα
// «N ανοιχτά Αιτήματα» κάθε Πελάτη), τα «για μένα» στις αναφορές. Οι μετρητές είναι ίδιοι σε κάθε όψη.
const requestsViewFor = (tab: InboxTab, view: RequestView): RequestView =>
  tab === "requests" ? view : tab === "conversations" ? "open" : "mine";

// J1 Εισερχόμενα στη νέα εμφάνιση (prototype `screens/J1.tsx`): Συνομιλίες, Αιτήματα, Με ανέφεραν. Η βάση αποφασίζει τι
// βλέπει ο Χρήστης· οι μετρητές είναι αδιάβαστα δικά του.
export async function SpacesInbox({ tab, view }: SpacesInboxProps) {
  const caps = messagesCaps(await getViewer());
  if (!caps.canChat)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {INBOX_NO_ACCESS_TEXT}
        </StateNotice>
      </div>
    );
  const shownView = allowedView(view, caps.canTransfer);
  const [inbox, requests, strip] = await Promise.all([
    getInbox(),
    getRequestsView(requestsViewFor(tab, shownView)),
    getSpaceStrip(codesOfSpace("talk")),
  ]);
  if (!inbox.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τα Εισερχόμενα" />
      </div>
    );
  return (
    <div data-spaces>
      <Strip stats={strip.stats} now={strip.now} />
      <Tabs
        tab={tab}
        inbox={inbox.data}
        requestsMine={requests.ok ? requests.data.counts.mine : null}
      />
      {tab === "conversations" && (
        <ConversationsTab
          inbox={inbox.data}
          open={requests.ok ? requests.data : null}
        />
      )}
      {tab === "requests" &&
        (requests.ok ? (
          <RequestsTab
            data={requests.data}
            view={shownView}
            canTransfer={caps.canTransfer}
          />
        ) : (
          <ErrorNotice what="τα Αιτήματα" />
        ))}
      {tab === "mentions" && <MentionsTab />}
    </div>
  );
}
