import { Notice } from "@/components/ui/notice";

import {
  filterMessages,
  newestAt,
  productionChips,
  type MessageFilters,
} from "../helpers";
import {
  COMPOSER_READONLY,
  FILTER_EMPTY_TITLE,
  PARTIAL_BANNER,
  THREAD_EMPTY_TEXT,
  THREAD_EMPTY_TITLE,
  THREAD_ERROR_TITLE,
  THREAD_FOOTER,
  THREAD_MISSING_TEXT,
  THREAD_MISSING_TITLE,
} from "../labels";
import { markThreadReadAfterRender } from "../mark-read";
import { getThread } from "../queries";
import { sideRequestsOf, timelineOf } from "../request-helpers";
import type { Thread } from "../view-schema";
import { AutoRefresh } from "./auto-refresh";
import { ChangeRequestItem } from "./change-request-item";
import { Composer } from "./composer";
import { MessageItem } from "./message-item";
import { ReadAtScope } from "./new-mark";
import { TeamRequestBox, loadCandidates, type CandidatesByProduction } from "./request-slot";
import { RequestsSide } from "./requests-side";
import { ThreadFilters } from "./thread-filters";
import { ThreadHeader } from "./thread-header";

interface ThreadScreenProps {
  clientId: string;
  filters: MessageFilters;
  clientHref?: string;
}

function MessageList({
  thread,
  filters,
  candidates,
}: {
  thread: Thread;
  filters: MessageFilters;
  candidates: CandidatesByProduction;
}) {
  const isFiltered = filters.production !== undefined || filters.filter !== "all";
  // Οι αλλαγές μετά την έγκριση δεν έχουν ετικέτα Μηνύματος: φαίνονται μόνο χωρίς φίλτρο (Μ12).
  const entries = timelineOf(
    filterMessages(thread.messages, filters),
    isFiltered ? [] : thread.changeRequests,
  );
  if (entries.length === 0) {
    return isFiltered ? (
      <Notice kind="empty" title={FILTER_EMPTY_TITLE} />
    ) : (
      <Notice kind="empty" title={THREAD_EMPTY_TITLE}>
        <p className="m-0">{THREAD_EMPTY_TEXT}</p>
      </Notice>
    );
  }
  return (
    <div className="grid gap-3">
      {entries.map((entry) =>
        entry.type === "change" ? (
          <ChangeRequestItem key={entry.change.id} change={entry.change} isTeamViewer />
        ) : (
          <MessageItem
            key={entry.message.id}
            clientId={thread.client.id}
            message={entry.message}
            productions={thread.productions}
            canClearTag={thread.canWriteUntagged}
            isTeamViewer
            requestBox={<TeamRequestBox thread={thread} message={entry.message} candidates={candidates} />}
          />
        ),
      )}
    </div>
  );
}

function ComposerArea({
  thread,
  production,
}: {
  thread: Thread;
  production?: string;
}) {
  if (!thread.canWrite)
    return (
      <p className="m-0 text-sm text-muted-foreground">{COMPOSER_READONLY}</p>
    );
  return (
    <Composer
      clientId={thread.client.id}
      productions={thread.productions}
      canWriteUntagged={thread.canWriteUntagged}
      mentionable={thread.mentionable ?? []}
      defaultProduction={production}
      editMinutes={thread.editMinutes}
    />
  );
}

function titleOf(thread: Thread, id: string | undefined): string | undefined {
  if (id === undefined) return undefined;
  return (
    thread.productions.find((production) => production.id === id)?.title ??
    thread.messages.find((message) => message.productionId === id)
      ?.productionTitle ??
    undefined
  );
}

// J2: η Συνομιλία ενός Πελάτη για την ομάδα. Μόνο ορατά Μηνύματα (η βάση τα φιλτράρει ανά Εύρος), φίλτρα, συντάκτης και Μ2.
export async function ThreadScreen({
  clientId,
  filters,
  clientHref,
}: ThreadScreenProps) {
  const result = await getThread(clientId);
  if (!result.ok) return <Notice kind="error" title={THREAD_ERROR_TITLE} />;
  const thread = result.data;
  if (thread === null) {
    return (
      <Notice kind="empty" title={THREAD_MISSING_TITLE}>
        <p className="m-0">{THREAD_MISSING_TEXT}</p>
      </Notice>
    );
  }
  if (thread.messages.length > 0) await markThreadReadAfterRender(clientId, newestAt(thread.messages));
  const candidates = await loadCandidates(thread);
  return (
    <>
      <AutoRefresh />
      <ThreadHeader client={thread.client} clientHref={clientHref} />
      <ThreadFilters
        clientId={clientId}
        chips={productionChips(thread.messages)}
        active={filters}
        activeTitle={titleOf(thread, filters.production)}
        hideUntagged={thread.partial}
      />
      {thread.partial && (
        <p className="mb-4 mt-0 rounded-md border bg-muted px-4 py-3 text-sm">
          {PARTIAL_BANNER}
        </p>
      )}
      <div className="grid gap-4">
        <ReadAtScope readAt={thread.readAt}>
          <MessageList thread={thread} filters={filters} candidates={candidates} />
        </ReadAtScope>
        <ComposerArea thread={thread} production={filters.production} />
        <RequestsSide items={sideRequestsOf(thread.messages, thread.changeRequests)} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{THREAD_FOOTER}</p>
    </>
  );
}
