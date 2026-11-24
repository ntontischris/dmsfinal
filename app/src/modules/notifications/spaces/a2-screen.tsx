import Link from "next/link";
import type { ReactNode } from "react";

import { can, getViewer, isClientViewer } from "@/modules/access";
import { initialsOf } from "@/spaces/shell/avatar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  AUTOMATIONS_PATH,
  LOCKED_TEXT,
  PREFS_CLIENT_NOTE,
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
  LANGUAGE_TITLE,
  NO_ACCESS_TEXT,
  NOTIFICATIONS_TITLE,
  RETENTION_NOTE,
} from "../labels";
import { getMyLanguage, getNotifications } from "../queries";
import { getPrefs } from "../queries-automations";
import type { NotificationPage } from "../view-schema";
import {
  a2ItemsOf,
  a2PrefGroupsOf,
  type A2Item,
  type A2PrefGroup,
} from "./a2-adapter";
import { A2Empty } from "./a2-empty";
import { SpacesLanguageChoice } from "./a3-language";
import { MarkAllRead } from "./a2-mark-all";
import { PrefToggle } from "./a2-pref-toggle";

import "../../finance/spaces/money-lines.css";
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
    <nav className="page-filters" aria-label="Ειδοποιήσεις">
      {(Object.keys(labels) as A2Tab[]).map((t) => (
        <Link
          key={t}
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
    <div className="a2-filters">
      <nav className="page-filters" aria-label="Προβολή Ειδοποιήσεων">
        <Link
          href={notificationsHref("unread")}
          aria-current={filter === "unread" ? "page" : undefined}
        >
          Αδιάβαστες
        </Link>
        <Link
          href={notificationsHref("all")}
          aria-current={filter === "all" ? "page" : undefined}
        >
          Όλες
        </Link>
      </nav>
      <MarkAllRead isDisabled={unread === 0} />
    </div>
  );
}

// Μία Ειδοποίηση = μία γραμμή: η αδιάβαστη με γαλάζια τελεία και την ετικέτα «Νέα» (αδιάβαστο δεν σημαίνει επείγον),
// η διαβασμένη σβηστή.
function NotificationLine({ item }: { item: A2Item }) {
  return (
    <li
      className="ml-line a2-line"
      data-unread={!item.isRead || undefined}
      data-faded={item.isRead || undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(item.title)}
      </span>
      <div className="ml-main">
        {!item.isRead && <span className="ml-tag">Νέα</span>}
        <strong>{item.title}</strong>
        <small>{item.sub}</small>
      </div>
      <span className="ml-quick">
        <OpenButton id={item.id}>Άνοιγμα</OpenButton>
      </span>
    </li>
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
        <>
          <p className="a2-count">
            {items.length} {items.length === 1 ? "Ειδοποίηση" : "Ειδοποιήσεις"}
          </p>
          <ul className="ml-list" aria-label="Ειδοποιήσεις">
          {items.map((item) => (
            <NotificationLine key={item.id} item={item} />
          ))}
          </ul>
        </>
      ) : (
        <A2Empty title={EMPTY_TITLE}>{EMPTY_TEXT}</A2Empty>
      )}
      {page.hasMore && last && (
        <p className="ml-quick a2-more">
          <Link
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
  isClient,
  canConfigure,
  language,
}: {
  groups: readonly A2PrefGroup[];
  isClient: boolean;
  canConfigure: boolean;
  // «Γλώσσα των email», μόνο για τον Χρήστη πελάτη (#171).
  language: ReactNode;
}) {
  return (
    <>
      <p className="note">{isClient ? PREFS_CLIENT_NOTE : PREFS_TEAM_NOTE}</p>
      {groups.length === 0 ? (
        <A2Empty title={PREFS_EMPTY_TITLE}>{PREFS_EMPTY_TEXT}</A2Empty>
      ) : (
        groups.map((group) => (
          <details key={group.label} className="ml-box">
            <summary>
              <span className="ml-box-title">{group.label}</span>
              <small>{group.rows.length}</small>
            </summary>
            <ul className="ml-list a2-prefs">
              {group.rows.map((pref) => (
                <li
                  key={pref.automationId}
                  className="ml-line"
                  data-faded={!pref.canMute || undefined}
                >
                  <span className="ml-thumb" aria-hidden="true">
                    {pref.channel.charAt(0).toUpperCase()}
                  </span>
                  <div className="ml-main">
                    <span className="ml-tag">{pref.channel}</span>
                    <PrefToggle {...pref} />
                    {!pref.canMute && <small>🔒 {LOCKED_TEXT}</small>}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))
      )}
      <p className="note">{PREFS_SELF_NOTE}</p>
      {canConfigure && (
        <p>
          <Link href={AUTOMATIONS_PATH}>Ρύθμιση Αυτοματισμών</Link>
        </p>
      )}
      {language}
    </>
  );
}

async function PrefsBody({
  isClient,
  canConfigure,
}: {
  isClient: boolean;
  canConfigure: boolean;
}) {
  const [prefs, language] = await Promise.all([
    getPrefs(),
    isClient ? getMyLanguage() : null,
  ]);
  if (!prefs.ok) return <ErrorNotice what="οι Προτιμήσεις" />;
  return (
    <PrefsTab
      groups={a2PrefGroupsOf(prefs.data ?? [])}
      isClient={isClient}
      canConfigure={canConfigure}
      language={
        language?.ok && language.data ? (
          <details className="ml-box">
            <summary>
              <h2 className="ml-box-title">{LANGUAGE_TITLE}</h2>
            </summary>
            <SpacesLanguageChoice current={language.data} />
          </details>
        ) : null
      }
    />
  );
}

// A2 Ειδοποιήσεις στη νέα εμφάνιση (prototype `screens/A2.tsx`): Εισερχόμενα και Προτιμήσεις, για την ομάδα και τον
// Χρήστη πελάτη. Η βάση δείχνει μόνο τις δικές σου Ειδοποιήσεις.
export async function SpacesNotifications({
  tab,
  filter,
  cursor,
}: SpacesNotificationsProps) {
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
      <header className="page-head">
        <h1>
          {NOTIFICATIONS_TITLE}
          <span className="page-head-dot">.</span>
        </h1>
      </header>
      <Tabs tab={tab} unread={page?.unread ?? null} />
      {tab === "prefs" ? (
        <PrefsBody
          isClient={isClientViewer(viewer)}
          canConfigure={can(viewer, "automations.manage")}
        />
      ) : page ? (
        <InboxTab page={page} filter={filter} />
      ) : (
        <ErrorNotice what="οι Ειδοποιήσεις" />
      )}
    </div>
  );
}
