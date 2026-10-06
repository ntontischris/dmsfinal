import Link from "next/link";

import {
  inboxOf,
  notificationCapsOf,
  preferencesOf,
} from "@/data/notifications-access";
import { BellPreview, InboxFilters, InboxList } from "@/screens/a2-inbox";
import {
  parseShow,
  parseTab,
  unreadCount,
  visibleItems,
  type A2Tab,
} from "@/screens/a2-model";
import { PrefsTab } from "@/screens/a2-prefs";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./a2.css";

export function A2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="A2"
      state={state}
      keep={{ tab: query.tab, show: query.show }}
    />
  );
  if (!notificationCapsOf(role).hasInbox) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Ως Επισκέπτης δεν έχεις λογαριασμό, άρα ούτε Ειδοποιήσεις.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="οι Ειδοποιήσεις" />
      </>
    );
  }
  return (
    <>
      {header}
      <Notifications role={role} query={query} isEmpty={state === "empty"} />
    </>
  );
}

interface BodyProps extends ScreenProps {
  isEmpty: boolean;
}

function Notifications({ role, query, isEmpty }: BodyProps) {
  const tab = parseTab(query.tab);
  const items = isEmpty ? [] : inboxOf(role);
  const labels: Readonly<Record<A2Tab, string>> = {
    inbox: `Εισερχόμενα (${unreadCount(items)})`,
    prefs: "Προτιμήσεις",
  };
  return (
    <>
      <nav className="tabs" aria-label="Ειδοποιήσεις">
        {(Object.keys(labels) as A2Tab[]).map((t) => (
          <Link
            key={t}
            className="tab"
            aria-current={t === tab ? "page" : undefined}
            href={screenHref(role, "A2", {
              tab: t === "inbox" ? undefined : t,
              state: query.state,
            })}
          >
            {labels[t]}
          </Link>
        ))}
      </nav>
      {tab === "inbox" ? (
        <InboxTab role={role} query={query} items={items} />
      ) : (
        <PrefsTab role={role} prefs={isEmpty ? [] : preferencesOf(role)} />
      )}
    </>
  );
}

interface InboxTabProps extends ScreenProps {
  items: ReturnType<typeof inboxOf>;
}

function InboxTab({ role, query, items }: InboxTabProps) {
  const show = parseShow(query.show);
  const visible = visibleItems(items, show);
  return (
    <>
      <BellPreview items={items} />
      <InboxFilters role={role} show={show} query={query} />
      {visible.length > 0 ? (
        <InboxList role={role} items={visible} />
      ) : (
        <StateNotice kind="empty" title="Καμία Ειδοποίηση">
          Όταν συμβεί κάτι που σε αφορά, θα το δεις εδώ.
        </StateNotice>
      )}
      <p className="note">
        Οι Ειδοποιήσεις κρατιούνται 90 μέρες. Οι νεότερες είναι πρώτες· το κλικ
        ανοίγει το σχετικό και τη σημειώνει διαβασμένη.
      </p>
    </>
  );
}
