import Link from "next/link";

import {
  conversationsOf,
  findClientOf,
  messageCapsOf,
  requestViewsOf,
  requestsOf,
} from "@/data/messages-access";
import { ConversationList, MentionList } from "@/screens/j1-lists";
import {
  countsOf,
  parseTab,
  parseView,
  visibleMentions,
  type InboxTab,
} from "@/screens/j1-model";
import { NewMessage } from "@/screens/j1-new";
import {
  RequestList,
  UNASSIGNED_NOTE,
  VIEW_EMPTY,
  ViewLinks,
} from "@/screens/j1-requests";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./j1.css";

const EMPTY_TEXT: Readonly<Record<InboxTab, { title: string; text: string }>> =
  {
    conversations: {
      title: "Καμία Συνομιλία ακόμα",
      text: "Οι Συνομιλίες εμφανίζονται όταν γράψει ένας Πελάτης ή η ομάδα.",
    },
    requests: {
      title: "Κανένα ανοιχτό Αίτημα",
      text: "Όταν ένας Πελάτης ζητήσει κάτι, θα φανεί εδώ.",
    },
    mentions: {
      title: "Κανείς δεν σε ανέφερε",
      text: "Οι @αναφορές προς εσένα εμφανίζονται εδώ.",
    },
  };

const SCOPE_NOTES: Readonly<Record<string, string>> = {
  production:
    "Βλέπεις μόνο Μηνύματα με την ετικέτα των Παραγωγών όπου είσαι Μέλος, και όσα σε ανέφεραν.",
  sales: "Βλέπεις ολόκληρη τη Συνομιλία των Πελατών όπου είσαι Υπεύθυνος.",
};

const clientName = (id: string): string => findClientOf(id)?.name ?? "—";

export function J1({ role, query }: ScreenProps) {
  const caps = messageCapsOf(role);
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="J1"
      state={state}
      keep={{ tab: query.tab, view: query.view }}
    />
  );
  if (!caps.canSee || caps.isClient) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα Εισερχόμενα είναι για την ομάδα.
          {caps.isClient && (
            <p>
              <Link href={screenHref(role, "J3", {})}>Τα Μηνύματά σου</Link>
            </p>
          )}
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τα Εισερχόμενα" />
      </>
    );
  }
  return (
    <>
      {header}
      <Inbox role={role} query={query} isEmpty={state === "empty"} />
    </>
  );
}

interface InboxProps extends ScreenProps {
  isEmpty: boolean;
}

function Inbox({ role, query, isEmpty }: InboxProps) {
  const tab = parseTab(query.tab);
  const counts = countsOf(role, isEmpty);
  const labels: Readonly<Record<InboxTab, string>> = {
    conversations: `Συνομιλίες (${counts.unread})`,
    requests: `Αιτήματα (${counts.requests})`,
    mentions: `Με ανέφεραν (${counts.mentions})`,
  };
  return (
    <>
      <nav className="tabs" aria-label="Εισερχόμενα">
        {(Object.keys(labels) as InboxTab[]).map((t) => (
          <Link
            key={t}
            className="tab"
            aria-current={t === tab ? "page" : undefined}
            href={screenHref(role, "J1", {
              tab: t === "conversations" ? undefined : t,
              state: query.state,
            })}
          >
            {labels[t]}
          </Link>
        ))}
      </nav>
      {tab === "conversations" && (
        <ConversationsTab role={role} isEmpty={isEmpty} />
      )}
      {tab === "requests" && (
        <RequestsTab role={role} query={query} isEmpty={isEmpty} />
      )}
      {tab === "mentions" && <MentionsTab role={role} isEmpty={isEmpty} />}
      <p className="note">
        Τα Αιτήματα έχουν σταθερά είδη (νέο Παραδοτέο, Γύρισμα, αλλαγή μετά την
        έγκριση, άλλο) και καταστάσεις (ανοιχτό, ολοκληρώθηκε, απορρίφθηκε).
        Αυτόματη ανάθεση: Υπεύθυνος Παραγωγής της ετικέτας → Υπεύθυνος Πελάτη →
        «Χωρίς υπεύθυνο».
      </p>
    </>
  );
}

function EmptyNotice({ tab }: { tab: InboxTab }) {
  return (
    <StateNotice kind="empty" title={EMPTY_TEXT[tab].title}>
      {EMPTY_TEXT[tab].text}
    </StateNotice>
  );
}

function ConversationsTab({
  role,
  isEmpty,
}: {
  role: ScreenProps["role"];
  isEmpty: boolean;
}) {
  const rows = isEmpty ? [] : conversationsOf(role);
  const options = rows.map((r) => ({
    id: r.client.id,
    name: r.client.name,
    href: screenHref(role, "J2", { client: r.client.id }),
  }));
  return (
    <>
      <NewMessage options={options} />
      {rows.length > 0 ? (
        <ConversationList role={role} rows={rows} />
      ) : (
        <EmptyNotice tab="conversations" />
      )}
      <p className="note">
        Τα αδιάβαστα είναι μόνο δικά σου· κανείς δεν βλέπει τι διάβασαν οι
        άλλοι.
      </p>
      {SCOPE_NOTES[role] && <p className="note">{SCOPE_NOTES[role]}</p>}
    </>
  );
}

interface RequestsTabProps {
  role: ScreenProps["role"];
  query: ScreenProps["query"];
  isEmpty: boolean;
}

function RequestsTab({ role, query, isEmpty }: RequestsTabProps) {
  const view = parseView(role, query.view);
  const items = isEmpty ? [] : requestsOf(role, view);
  return (
    <>
      <ViewLinks
        role={role}
        views={requestViewsOf(role)}
        view={view}
        state={query.state}
      />
      {view === "χωρίς υπεύθυνο" && <p className="note">{UNASSIGNED_NOTE}</p>}
      {items.length > 0 ? (
        <RequestList role={role} items={items} />
      ) : (
        <StateNotice
          kind="empty"
          title={isEmpty ? EMPTY_TEXT.requests.title : VIEW_EMPTY[view]}
        />
      )}
    </>
  );
}

function MentionsTab({
  role,
  isEmpty,
}: {
  role: ScreenProps["role"];
  isEmpty: boolean;
}) {
  const items = isEmpty ? [] : visibleMentions(role);
  return (
    <>
      {items.length > 0 ? (
        <MentionList role={role} items={items} clientName={clientName} />
      ) : (
        <EmptyNotice tab="mentions" />
      )}
      <p className="note">
        Η @αναφορά σού δείχνει μόνο εκείνο το Εσωτερικό Μήνυμα, όχι όλη τη
        Συνομιλία.
      </p>
    </>
  );
}
