import Link from "next/link";

import { NOW } from "@/data/filming";
import { MESSAGE_RULES, type MessageRequest } from "@/data/messages";
import {
  canDeleteMessage,
  canEditMessage,
  isOwnMessage,
  isUnread,
  messagesOf,
  productionsOfClient,
  type RequestMessage,
} from "@/data/messages-access";
import { KYPSELI_ID } from "@/data/sales";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import { fmtWhen } from "./j-message";
import { RequestBox, type ClosingLinkView } from "./j3-request-box";
import { J3Thread, type ThreadItem } from "./j3-thread";

import "./j3.css";

const linkOf = (request: MessageRequest): ClosingLinkView | undefined => {
  const link = request.closing?.link;
  return link
    ? {
        label: link.label,
        href: screenHref(
          "client",
          link.code === "H2" ? "H4" : link.code,
          link.params,
        ),
      }
    : undefined;
};

const isRequestMessage = (m: {
  request?: MessageRequest;
}): m is RequestMessage => !!m.request;

const byOpenThenDate = (a: RequestMessage, b: RequestMessage): number => {
  const rank = (m: RequestMessage) => (m.request.state === "ανοιχτό" ? 0 : 1);
  return (
    rank(a) - rank(b) ||
    b.request.declaredAt.localeCompare(a.request.declaredAt)
  );
};

function Denied({ role }: { role: ScreenProps["role"] }) {
  const isTeam = role !== "visitor";
  return (
    <StateNotice kind="denied" title="Χωρίς δικαίωμα">
      <p>
        {isTeam
          ? "Αυτή είναι η σελίδα του πελάτη. Η ομάδα δουλεύει από τα Εισερχόμενα."
          : "Χρειάζεται σύνδεση ως πελάτης."}
      </p>
      {isTeam && (
        <p>
          <Link href={screenHref(role, "J1", {})}>Άνοιγμα Εισερχομένων</Link>
        </p>
      )}
    </StateNotice>
  );
}

function RequestsTab({ items }: { items: readonly RequestMessage[] }) {
  if (items.length === 0)
    return (
      <StateNotice kind="empty" title="Δεν έχεις στείλει Αίτημα">
        <p>Όταν ζητήσεις κάτι από τη Συνομιλία, θα το βρεις εδώ.</p>
      </StateNotice>
    );
  return (
    <ul className="list">
      {items.map((m) => (
        <li key={m.id} className="row j3-grid">
          <div className="j3-req-head">
            <strong>{m.request.kind}</strong>
            <Badge
              tone={m.request.state === "ανοιχτό" ? "attention" : undefined}
            >
              {m.request.state}
            </Badge>
            <span className="muted">{fmtWhen(m.request.declaredAt)}</span>
          </div>
          <p>{m.text}</p>
          <RequestBox request={m.request} link={linkOf(m.request)} />
          <Link
            href={`${screenHref("client", "J3", { tab: "conversation" })}#${m.id}`}
          >
            Δες στη Συνομιλία
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Toggle({ isViewer, tab }: { isViewer: boolean; tab: string }) {
  const href = (as?: string) =>
    screenHref("client", "J3", {
      tab: tab === "requests" ? tab : undefined,
      as,
    });
  return (
    <p className="j3-toggle">
      <span>Δες ως:</span>
      <Link href={href()} aria-current={!isViewer}>
        Πλήρης
      </Link>
      <span>·</span>
      <Link href={href("viewer")} aria-current={isViewer}>
        Μόνο ανάγνωση (Βλέπει Συνομιλία)
      </Link>
    </p>
  );
}

function Notes() {
  return (
    <section className="card j3-grid">
      <h2 className="card-title">Ειδοποιήσεις</h2>
      <p className="muted">
        Παίρνεις ειδοποίηση μέσα στο DMS για κάθε νέο Μήνυμα της ομάδας. Αν
        μείνουν αδιάβαστα για {MESSAGE_RULES.digestMinutes} λεπτά, έρχεται ένα
        μόνο συγκεντρωτικό email με κουμπί «Απάντησε στο DMS». Η απάντηση στο
        ίδιο το email δεν φτάνει στην ομάδα.
      </p>
      <p className="muted">
        Αν ανήκεις σε περισσότερους Πελάτες, βλέπεις τη Συνομιλία του Πελάτη που
        έχεις επιλέξει.
      </p>
      <p className="muted">
        Σχόλια πάνω στο video γράφονται στο Παραδοτέο, όχι εδώ.
      </p>
    </section>
  );
}

export function J3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const tab = query.tab === "requests" ? "requests" : "conversation";
  const isViewer = query.as === "viewer";
  const switcher = (
    <StateSwitcher
      role={role}
      code="J3"
      state={state}
      keep={{ tab: query.tab, as: query.as }}
    />
  );
  if (role !== "client")
    return (
      <>
        {switcher}
        <Denied role={role} />
      </>
    );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="τα Μηνύματα" />
      </>
    );

  const messages = state === "empty" ? [] : messagesOf("client", KYPSELI_ID);
  const requests = messages.filter(isRequestMessage).sort(byOpenThenDate);
  const open = requests.filter((m) => m.request.state === "ανοιχτό").length;
  const items: readonly ThreadItem[] = messages.map((m) => ({
    message: m,
    isUnread: isUnread("client", m),
    isOwn: isOwnMessage("client", m),
    canEdit: canEditMessage("client", m),
    canDelete: canDeleteMessage("client", m),
    link: m.request ? linkOf(m.request) : undefined,
  }));
  const tabHref = (t?: string) =>
    screenHref("client", "J3", { tab: t, as: query.as });

  return (
    <div className="j3-grid" id="top">
      {switcher}
      <Toggle isViewer={isViewer} tab={tab} />
      <nav className="tabs" aria-label="Μηνύματα">
        <Link
          className="tab"
          href={tabHref()}
          aria-current={tab === "conversation" ? "page" : undefined}
        >
          Συνομιλία
        </Link>
        <Link
          className="tab"
          href={tabHref("requests")}
          aria-current={tab === "requests" ? "page" : undefined}
        >
          Αιτήματα ({open} ανοιχτά)
        </Link>
      </nav>
      {tab === "conversation" ? (
        <J3Thread
          initial={items}
          productions={productionsOfClient(KYPSELI_ID).map((p) => ({
            id: p.id,
            title: p.title,
          }))}
          nowIso={NOW}
          isReadOnly={isViewer}
          bookingHref={screenHref("client", "E1", {})}
          changeHref={screenHref("client", "H4", {})}
        />
      ) : (
        <RequestsTab items={requests} />
      )}
      <Notes />
    </div>
  );
}
