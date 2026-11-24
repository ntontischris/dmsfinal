import Link from "next/link";

import { getViewer } from "@/modules/access";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { messagesCaps } from "../caps";
import { AutoRefresh } from "../components/auto-refresh";
import { chatTopicOf } from "../components/refresh-mode";
import {
  loadCandidates,
  type CandidatesByProduction,
} from "../deliverable-candidates";
import {
  MESSAGES_PATH,
  filterMessages,
  newestAt,
  productionChips,
  threadHref,
  type MessageFilters,
} from "../helpers";
import {
  BACK_TO_INBOX,
  COMPOSER_READONLY,
  PARTIAL_BANNER,
  THREAD_EMPTY_TEXT,
  THREAD_EMPTY_TITLE,
  THREAD_FOOTER,
  THREAD_MISSING_TEXT,
  THREAD_NO_ACCESS_TEXT,
} from "../labels";
import { markThreadReadAfterRender } from "../mark-read";
import { getInbox, getThread } from "../queries";
import { sideRequestsOf, timelineOf } from "../request-helpers";
import type { InboxItem, Thread } from "../view-schema";
import { JEmpty } from "./j-empty";
import { MessageBubble } from "./j-message";
import { MessageActions } from "./j2-actions";
import {
  j2ChangeOf,
  j2DefaultTag,
  j2FilterOf,
  j2HeaderOf,
  j2MessageOf,
  j2SideOf,
} from "./j2-adapter";
import { Composer } from "./j2-composer";
import { ReadAtScope } from "./j2-read-at";
import { ChangeBubble, RequestBox } from "./j2-request";
import { J2Side } from "./j2-side";

import "../../finance/spaces/money-lines.css";
import "./j.css";
import "./j2.css";

interface SpacesThreadProps {
  // Ήδη ελεγμένο uuid· undefined = άκυρη διεύθυνση.
  clientId: string | undefined;
  filters: MessageFilters;
}

function Header({
  thread,
  clientHref,
}: {
  thread: Thread;
  clientHref: string | undefined;
}) {
  const header = j2HeaderOf(thread.client, clientHref);
  return (
    <header className="ml-hero j2-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(header.name)}
      </span>
      <div>
        <span className="ml-tag">Συνομιλία</span>
        <h1>{header.name}</h1>
        <p>{header.sub}</p>
      </div>
      <span className="ml-quick">
        {header.href && <Link href={header.href}>Καρτέλα Πελάτη</Link>}
        <Link href={MESSAGES_PATH}>{BACK_TO_INBOX}</Link>
      </span>
    </header>
  );
}

// «Άλλη Συνομιλία»: αλλαγή Πελάτη χωρίς επιστροφή στα Εισερχόμενα (μόνο όταν υπάρχουν κι άλλες).
function ThreadSwitch({
  thread,
  others,
}: {
  thread: Thread;
  others: readonly InboxItem[];
}) {
  if (others.length < 2) return null;
  return (
    <FilterBar
      label="Άλλη Συνομιλία"
      filters={[
        {
          label: "Πελάτης",
          isSearchable: true,
          options: others.map((row) => ({
            label: row.clientName,
            href: threadHref(row.clientId),
            isCurrent: row.clientId === thread.client.id,
          })),
        },
      ]}
    />
  );
}

function ProductionFilter({
  thread,
  filters,
}: {
  thread: Thread;
  filters: MessageFilters;
}) {
  const chips = productionChips(thread.messages);
  return (
    <FilterBar
      filters={[j2FilterOf(thread.client.id, chips, filters, thread.partial)]}
      clearHref={threadHref(thread.client.id)}
    />
  );
}

function Timeline({
  thread,
  filters,
  candidates,
}: {
  thread: Thread;
  filters: MessageFilters;
  candidates: CandidatesByProduction;
}) {
  const isFiltered =
    filters.production !== undefined || filters.filter !== "all";
  // Οι αλλαγές μετά την έγκριση δεν έχουν ετικέτα Μηνύματος: φαίνονται μόνο χωρίς φίλτρο (Μ12).
  const entries = timelineOf(
    filterMessages(thread.messages, filters),
    isFiltered ? [] : thread.changeRequests,
  );
  if (entries.length === 0)
    return isFiltered ? (
      <p className="muted">Κανένα Μήνυμα σε αυτό το φίλτρο.</p>
    ) : (
      <JEmpty title={THREAD_EMPTY_TITLE}>{THREAD_EMPTY_TEXT}</JEmpty>
    );
  return (
    <ReadAtScope readAt={thread.readAt}>
      {entries.map((entry) => {
        if (entry.type === "change")
          return (
            <ChangeBubble
              key={entry.change.id}
              change={j2ChangeOf(entry.change)}
            />
          );
        const message = j2MessageOf(thread, entry.message);
        return (
          <MessageBubble
            key={message.id}
            message={message}
            actions={
              message.isDeleted ? undefined : (
                <MessageActions
                  message={message}
                  productions={thread.productions}
                  canClearTag={thread.canWriteUntagged}
                />
              )
            }
          >
            <RequestBox
              thread={thread}
              message={message}
              candidates={candidates}
            />
          </MessageBubble>
        );
      })}
    </ReadAtScope>
  );
}

function Denied({ text }: { text: string }) {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>{text}</p>
      </StateNotice>
    </div>
  );
}

// J2 Συνομιλία στη νέα εμφάνιση (prototype `screens/J2.tsx`): μόνο τα ορατά Μηνύματα (η βάση φιλτράρει ανά Εύρος),
// φίλτρα ετικέτας, Αιτήματα με τις ενέργειές τους, συντάκτης και πλαϊνό «Αιτήματα αυτού του Πελάτη».
export async function SpacesThread({ clientId, filters }: SpacesThreadProps) {
  const caps = messagesCaps(await getViewer());
  if (!caps.canChat) return <Denied text={THREAD_NO_ACCESS_TEXT} />;
  if (clientId === undefined) return <Denied text={THREAD_MISSING_TEXT} />;
  const [result, inbox] = await Promise.all([getThread(clientId), getInbox()]);
  if (!result.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η Συνομιλία" />
      </div>
    );
  const thread = result.data;
  if (thread === null) return <Denied text={THREAD_MISSING_TEXT} />;
  if (thread.messages.length > 0)
    await markThreadReadAfterRender(clientId, newestAt(thread.messages));
  const candidates = await loadCandidates(thread);
  return (
    <div data-spaces>
      <AutoRefresh topic={chatTopicOf("team", clientId)} />
      <Header
        thread={thread}
        clientHref={caps.canOpenClient ? `/app/clients/${clientId}` : undefined}
      />
      {thread.partial && <p className="note">{PARTIAL_BANNER}</p>}
      <div className="j2-filters">
        <ThreadSwitch thread={thread} others={inbox.ok ? inbox.data.items : []} />
        <ProductionFilter thread={thread} filters={filters} />
      </div>
      <div className="j2-layout">
        <div className="j2-thread">
          <Timeline thread={thread} filters={filters} candidates={candidates} />
          {thread.canWrite ? (
            <Composer
              clientId={thread.client.id}
              clientName={thread.client.name}
              productions={thread.productions}
              canWriteUntagged={thread.canWriteUntagged}
              mentionable={thread.mentionable ?? []}
              defaultTag={j2DefaultTag(
                thread.productions,
                thread.canWriteUntagged,
                filters.production,
              )}
              editMinutes={thread.editMinutes}
            />
          ) : (
            <p className="muted">{COMPOSER_READONLY}</p>
          )}
        </div>
        <J2Side
          rows={j2SideOf(
            sideRequestsOf(thread.messages, thread.changeRequests),
          )}
        />
      </div>
      <p className="note">{THREAD_FOOTER}</p>
    </div>
  );
}
