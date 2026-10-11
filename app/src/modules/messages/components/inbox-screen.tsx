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
import { getInbox, getMentions, getWritableClients } from "../queries";
import type { Inbox } from "../view-schema";
import { ConversationList } from "./conversation-list";
import { MentionList } from "./mention-list";
import { NewMessage } from "./new-message";

function LoadError() {
  return (
    <Notice kind="error" title={INBOX_ERROR_TITLE}>
      <p className="m-0">{INBOX_ERROR_TEXT}</p>
    </Notice>
  );
}

// Οι καρτέλες των Εισερχομένων. Η καρτέλα «Αιτήματα» (Jδ) μπαίνει εδώ ως τρίτη επιλογή.
function tabOptions(inbox: Inbox, current: InboxTab): SegmentedOption[] {
  return [
    {
      label: tabLabel(TAB_CONVERSATIONS, unreadTotal(inbox.items)),
      href: MESSAGES_PATH,
      isCurrent: current === "conversations",
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
export async function InboxScreen({ tab }: { tab: InboxTab }) {
  const inbox = await getInbox();
  if (!inbox.ok) return <LoadError />;
  return (
    <div className="grid gap-4">
      <Tabs label={INBOX_TABS_LABEL} options={tabOptions(inbox.data, tab)} />
      <div>
        {tab === "mentions" ? (
          <MentionsTab />
        ) : (
          <ConversationsTab inbox={inbox.data} />
        )}
      </div>
    </div>
  );
}
