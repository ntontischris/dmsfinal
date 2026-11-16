import Link from "next/link";

import { getViewer } from "@/modules/access";
import { getSpaceStrip } from "@/modules/today";
import { codesOfSpace } from "@/spaces/data/spaces";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { messagesCaps } from "../caps";
import { MESSAGES_PATH, threadHref, type InboxTab } from "../helpers";
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
import { needsMeOf } from "../needs-me";
import type { Inbox, RequestsView } from "../view-schema";
import {
  inboxTabCountsOf,
  j1ConversationsOf,
  j1MentionsOf,
  j1RequestsOf,
  tabLabelOf,
} from "./j1-adapter";
import { ConversationList, MentionList, NeedsMeList } from "./j1-lists";
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
  open,
}: {
  tab: InboxTab;
  inbox: Inbox;
  open: RequestsView | null;
}) {
  const counts = inboxTabCountsOf(
    inbox.items,
    inbox.mentionsUnread,
    open?.items ?? null,
  );
  const labels: Readonly<Record<InboxTab, string>> = {
    conversations: tabLabelOf("Συνομιλίες", counts.conversations),
    requests: tabLabelOf("Αιτήματα", counts.requests),
    mentions: tabLabelOf("Με ανέφεραν", counts.mentions),
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
      <NeedsMeList rows={needsMeOf(inbox.items, open?.items ?? [])} />
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

// Τα «όλα τα ανοιχτά» φορτώνουν πάντα (λίστα «Χρειάζονται εμένα» και αριθμοί καρτελών)· η καρτέλα Αιτημάτων φορτώνει
// και την όψη της, αν είναι άλλη.
const loadRequests = async (tab: InboxTab, view: RequestView) => {
  const isOtherView = tab === "requests" && view !== "open";
  const [open, shown] = await Promise.all([
    getRequestsView("open"),
    isOtherView ? getRequestsView(view) : null,
  ]);
  return { open, shown: shown ?? open };
};

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
  const [inbox, { open, shown: requests }, strip] = await Promise.all([
    getInbox(),
    loadRequests(tab, shownView),
    getSpaceStrip(codesOfSpace("talk")),
  ]);
  const openData = open.ok ? open.data : null;
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
        open={openData}
      />
      {tab === "conversations" && (
        <ConversationsTab inbox={inbox.data} open={openData} />
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
