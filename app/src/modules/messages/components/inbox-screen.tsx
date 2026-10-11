import { Notice } from "@/components/ui/notice";
import { Tabs, type SegmentedOption } from "@/components/ui/segmented";

import { MESSAGES_PATH, unreadTotal, type InboxTab } from "../helpers";
import {
  CONVERSATIONS_EMPTY_TEXT,
  CONVERSATIONS_EMPTY_TITLE,
  INBOX_ERROR_TEXT,
  INBOX_ERROR_TITLE,
  INBOX_TABS_LABEL,
  MENTIONS_EMPTY_TEXT,
  MENTIONS_EMPTY_TITLE,
  MENTIONS_NOTE,
  SCOPE_NOTE,
  TAB_CONVERSATIONS,
  TAB_MENTIONS,
  UNREAD_NOTE,
  tabLabel,
} from "../labels";
import { getInbox, getMentions, getRequestsView, getWritableClients } from "../queries";
import { allowedView, type RequestView } from "../request-helpers";
import { TAB_REQUESTS } from "../request-labels";
import type { Inbox } from "../view-schema";
import { ConversationList } from "./conversation-list";
import { MentionList } from "./mention-list";
import { NewMessage } from "./new-message";
import { RequestsTab } from "./requests-tab";

function LoadError() {
  return (
    <Notice kind="error" title={INBOX_ERROR_TITLE}>
      <p className="m-0">{INBOX_ERROR_TEXT}</p>
    </Notice>
  );
}

// Οι καρτέλες των Εισερχομένων. Το «Αιτήματα (N)» είναι τα ανοιχτά Αιτήματα που έχεις αναλάβει (null αν δεν φόρτωσε).
function tabOptions(inbox: Inbox, requestsMine: number | null, current: InboxTab): SegmentedOption[] {
  return [
    {
      label: tabLabel(TAB_CONVERSATIONS, unreadTotal(inbox.items)),
      href: MESSAGES_PATH,
      isCurrent: current === "conversations",
    },
    {
      label: requestsMine === null ? TAB_REQUESTS : tabLabel(TAB_REQUESTS, requestsMine),
      href: `${MESSAGES_PATH}?tab=requests`,
      isCurrent: current === "requests",
    },
    {
      label: tabLabel(TAB_MENTIONS, inbox.mentionsUnread),
      href: `${MESSAGES_PATH}?tab=mentions`,
      isCurrent: current === "mentions",
    },
  ];
}

async function ConversationsTab({ inbox }: { inbox: Inbox }) {
  const writable = await getWritableClients();
  return (
    <>
      {writable.ok && <NewMessage clients={writable.data} />}
      {inbox.items.length > 0 ? (
        <ConversationList items={inbox.items} />
      ) : (
        <Notice kind="empty" title={CONVERSATIONS_EMPTY_TITLE}>
          <p className="m-0">{CONVERSATIONS_EMPTY_TEXT}</p>
        </Notice>
      )}
      <p className="mt-4 text-sm text-muted-foreground">{UNREAD_NOTE}</p>
      <p className="mt-1 text-sm text-muted-foreground">{SCOPE_NOTE}</p>
    </>
  );
}

async function MentionsTab() {
  const mentions = await getMentions();
  if (!mentions.ok) return <LoadError />;
  return (
    <>
      {mentions.data.length > 0 ? (
        <MentionList items={mentions.data} />
      ) : (
        <Notice kind="empty" title={MENTIONS_EMPTY_TITLE}>
          <p className="m-0">{MENTIONS_EMPTY_TEXT}</p>
        </Notice>
      )}
      <p className="mt-4 text-sm text-muted-foreground">{MENTIONS_NOTE}</p>
    </>
  );
}

// J1: τα Εισερχόμενα της ομάδας. Οι μετρητές των καρτελών είναι αδιάβαστα δικά σου (Μ3).
interface InboxScreenProps {
  tab: InboxTab;
  view: RequestView;
  canTransfer: boolean;
}

export async function InboxScreen({ tab, view, canTransfer }: InboxScreenProps) {
  const shownView = allowedView(view, canTransfer);
  // Οι μετρητές των Αιτημάτων είναι ίδιοι σε κάθε όψη· στις άλλες καρτέλες αρκεί η «για μένα».
  const [inbox, requests] = await Promise.all([
    getInbox(),
    getRequestsView(tab === "requests" ? shownView : "mine"),
  ]);
  if (!inbox.ok) return <LoadError />;
  const requestsMine = requests.ok ? requests.data.counts.mine : null;
  return (
    <div className="grid gap-4">
      <Tabs label={INBOX_TABS_LABEL} options={tabOptions(inbox.data, requestsMine, tab)} />
      <div>
        {tab === "mentions" && <MentionsTab />}
        {tab === "conversations" && <ConversationsTab inbox={inbox.data} />}
        {tab === "requests" &&
          (requests.ok ? (
            <RequestsTab data={requests.data} view={shownView} canTransfer={canTransfer} />
          ) : (
            <LoadError />
          ))}
      </div>
    </div>
  );
}
