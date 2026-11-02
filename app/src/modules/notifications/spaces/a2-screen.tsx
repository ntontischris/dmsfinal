import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  AUTOMATIONS_PATH,
  LOCKED_TEXT,
  PREFS_EMPTY_TEXT,
  PREFS_EMPTY_TITLE,
  PREFS_SELF_NOTE,
  PREFS_TEAM_NOTE,
} from "../automation-labels";
import { OpenButton } from "../components/open-button";
import {
  notificationsHref,
  type NotificationCursor,
  type NotificationFilter,
} from "../helpers";
import {
  EMPTY_TEXT,
  EMPTY_TITLE,
  NO_ACCESS_TEXT,
  RETENTION_NOTE,
} from "../labels";
import { getNotifications } from "../queries";
import { getPrefs } from "../queries-automations";
import type { NotificationPage } from "../view-schema";
import { a2ItemsOf, a2PrefGroupsOf, type A2PrefGroup } from "./a2-adapter";
import { MarkAllRead } from "./a2-mark-all";
import { PrefToggle } from "./a2-pref-toggle";

import "./a2.css";

type A2Tab = "inbox" | "prefs";

interface SpacesNotificationsProps {
  tab: A2Tab;
  filter: NotificationFilter;
  cursor: NotificationCursor | null;
}

function Tabs({ tab, unread }: { tab: A2Tab; unread: number | null }) {
  const labels: Readonly<Record<A2Tab, string>> = {
    inbox: unread === null ? "Εισερχόμενα" : `Εισερχόμενα (${unread})`,
    prefs: "Προτιμήσεις",
  };
  const hrefs: Readonly<Record<A2Tab, string>> = {
    inbox: "/app/notifications",
    prefs: "/app/notifications?tab=prefs",
  };
  return (
    <nav className="tabs" aria-label="Ειδοποιήσεις">
      {(Object.keys(labels) as A2Tab[]).map((t) => (
        <Link
          key={t}
          className="tab"
          aria-current={t === tab ? "page" : undefined}
          href={hrefs[t]}
        >
          {labels[t]}
        </Link>
      ))}
    </nav>
  );
}

function InboxFilters({
  filter,
  unread,
}: {
  filter: NotificationFilter;
  unread: number;
}) {
  return (
    <div className="toolbar">
      <Link
        className="tab"
        href={notificationsHref("unread")}
        aria-current={filter === "unread" ? "page" : undefined}
      >
        Αδιάβαστες
      </Link>
      <Link
        className="tab"
        href={notificationsHref("all")}
        aria-current={filter === "all" ? "page" : undefined}
      >
        Όλες
      </Link>
      <MarkAllRead isDisabled={unread === 0} />
    </div>
  );
}

function InboxTab({
  page,
  filter,
}: {
  page: NotificationPage;
  filter: NotificationFilter;
}) {
  const items = a2ItemsOf(page.items, new Date());
  const last = page.items.at(-1);
  return (
    <>
      <InboxFilters filter={filter} unread={page.unread} />
      {items.length > 0 ? (
        <Panel label="Ειδοποιήσεις" aside={items.length} isFlush>
          <RowList>
            {items.map((item) => (
              <ListRow
                key={item.id}
                lead={
                  <span
                    className="a2-dot"
                    data-unread={!item.isRead}
                    aria-hidden="true"
                  />
                }
                title={item.title}
                sub={item.sub}
                isHighlighted={!item.isRead}
                aside={
                  <>
                    {!item.isRead && <Badge tone="strong">Νέα</Badge>}
                    <OpenButton id={item.id} className="button">
                      Άνοιγμα
                    </OpenButton>
                  </>
                }
              />
            ))}
          </RowList>
        </Panel>
      ) : (
        <StateNotice kind="empty" title={EMPTY_TITLE}>
          {EMPTY_TEXT}
        </StateNotice>
      )}
      {page.hasMore && last && (
        <p>
          <Link
            className="button"
            href={notificationsHref(filter, {
              at: last.createdAt,
              id: last.id,
            })}
          >
            Παλαιότερες
          </Link>
        </p>
      )}
      <p className="note">{RETENTION_NOTE}</p>
    </>
  );
}

function PrefsTab({
  groups,
  canConfigure,
}: {
  groups: readonly A2PrefGroup[];
  canConfigure: boolean;
}) {
  return (
    <>
      <p className="note">{PREFS_TEAM_NOTE}</p>
      {groups.length === 0 ? (
        <StateNotice kind="empty" title={PREFS_EMPTY_TITLE}>
          {PREFS_EMPTY_TEXT}
        </StateNotice>
      ) : (
        groups.map((group) => (
          <Panel
            key={group.label}
            label={group.label}
            aside={group.rows.length}
            isFlush
          >
            <RowList>
              {group.rows.map((pref) => (
                <ListRow
                  key={pref.automationId}
                  title={<PrefToggle {...pref} />}
                  sub={!pref.canMute ? `🔒 ${LOCKED_TEXT}` : undefined}
                  aside={<Badge>{pref.channel}</Badge>}
                />
              ))}
            </RowList>
          </Panel>
        ))
      )}
      <p className="note">{PREFS_SELF_NOTE}</p>
      {canConfigure && (
        <p>
          <Link href={AUTOMATIONS_PATH}>Ρύθμιση Αυτοματισμών</Link>
        </p>
      )}
    </>
  );
}

async function PrefsBody({ canConfigure }: { canConfigure: boolean }) {
  const prefs = await getPrefs();
  if (!prefs.ok) return <ErrorNotice what="οι Προτιμήσεις" />;
  return (
    <PrefsTab
      groups={a2PrefGroupsOf(prefs.data ?? [])}
      canConfigure={canConfigure}
    />
  );
}

// A2 Ειδοποιήσεις στη νέα εμφάνιση (prototype `screens/A2.tsx`): Εισερχόμενα και Προτιμήσεις. Η βάση δείχνει μόνο τις
// δικές σου Ειδοποιήσεις· η νέα εμφάνιση είναι μόνο για την ομάδα.
export async function SpacesNotifications({ tab, filter, cursor }: SpacesNotificationsProps) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in"
      ? await getNotifications(filter, tab === "inbox" ? cursor : null)
      : null;
  if (result === null || (result.ok && result.data === null))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {NO_ACCESS_TEXT}
        </StateNotice>
      </div>
    );
  const page = result.ok ? result.data : null;
  return (
    <div data-spaces>
      <Tabs tab={tab} unread={page?.unread ?? null} />
      {tab === "prefs" ? (
        <PrefsBody canConfigure={can(viewer, "automations.manage")} />
      ) : page ? (
        <InboxTab page={page} filter={filter} />
      ) : (
        <ErrorNotice what="οι Ειδοποιήσεις" />
      )}
    </div>
  );
}
