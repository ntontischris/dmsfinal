import Link from "next/link";

import { SENDS } from "@/data/notifications";
import {
  notificationCapsOf,
  sendsFor,
  type LogTab,
} from "@/data/notifications-access";
import { SALES_CLIENTS } from "@/data/sales";
import { SendTable } from "@/screens/k3-table";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./k3.css";

const parseTab = (v: string | undefined): LogTab =>
  v === "scheduled" || v === "failed" ? v : "all";

const CHANNELS = ["Ειδοποίηση", "email"] as const;

const TAB_NOTES: Readonly<Record<LogTab, string>> = {
  all: "Εδώ φαίνονται όσα έφυγαν (και όσα δεν έφυγαν).",
  scheduled:
    "Τα προγραμματισμένα υπολογίζονται ξανά αν αλλάξει η ημερομηνία του Γεγονότος.",
  failed:
    "Το «Ξαναστείλε» στέλνει την ίδια αποστολή μία φορά, δεν φτιάχνει δεύτερη.",
};

export function K3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { tab: query.tab, client: query.client, channel: query.channel };
  const header = (
    <StateSwitcher role={role} code="K3" state={state} keep={keep} />
  );
  if (!notificationCapsOf(role).canManage) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το Ιστορικό αποστολών το βλέπουν ο Ιδιοκτήτης και η Διαχείριση.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="το Ιστορικό αποστολών" />
      </>
    );
  }
  return (
    <>
      {header}
      <Log role={role} query={query} isEmpty={state === "empty"} />
    </>
  );
}

const countFailed = (): number =>
  SENDS.filter((s) => s.state === "απέτυχε").length;

interface LogProps extends ScreenProps {
  isEmpty: boolean;
}

function Log({ role, query, isEmpty }: LogProps) {
  const tab = parseTab(query.tab);
  const rows = isEmpty
    ? []
    : sendsFor(tab).filter(
        (s) =>
          (!query.client || s.clientId === query.client) &&
          (!query.channel || s.channel === query.channel),
      );
  const labels: Readonly<Record<LogTab, string>> = {
    all: "Στάλθηκαν",
    scheduled: "Προγραμματισμένα",
    failed: `Απέτυχαν (${isEmpty ? 0 : countFailed()})`,
  };
  const href = (extra: Record<string, string | undefined>) =>
    screenHref(role, "K3", { ...query, ...extra });
  return (
    <>
      <nav className="tabs" aria-label="Ιστορικό αποστολών">
        {(Object.keys(labels) as LogTab[]).map((t) => (
          <Link
            key={t}
            className="tab"
            aria-current={t === tab ? "page" : undefined}
            href={href({ tab: t === "all" ? undefined : t })}
          >
            {labels[t]}
          </Link>
        ))}
      </nav>
      <Filters query={query} href={href} />
      <p className="note">{TAB_NOTES[tab]}</p>
      {rows.length > 0 ? (
        <SendTable role={role} sends={rows} hasRetry={tab === "failed"} />
      ) : (
        <StateNotice kind="empty" title="Καμία αποστολή εδώ">
          Δεν υπάρχει τίποτα για αυτά τα φίλτρα.
        </StateNotice>
      )}
      <p className="note">
        Κρατιέται 24 μήνες: μόνο τίτλος, παραλήπτης, ώρα και αποτέλεσμα, όχι το
        σώμα του μηνύματος. Ο πελάτης δεν βλέπει Ιστορικό. Ανά Πελάτη υπάρχει
        στη Σελίδα Πελάτη:{" "}
        <Link
          href={screenHref(role, "B2", { id: "kypseli", tab: "dispatches" })}
        >
          Κυψέλη Καφέ
        </Link>
        .
      </p>
    </>
  );
}

interface FiltersProps {
  query: ScreenProps["query"];
  href: (extra: Record<string, string | undefined>) => string;
}

function Filters({ query, href }: FiltersProps) {
  const clients = SALES_CLIENTS.filter((c) =>
    SENDS.some((s) => s.clientId === c.id),
  );
  return (
    <div className="k3-filters">
      <span className="muted">Πελάτης:</span>
      <Link href={href({ client: undefined })} aria-current={!query.client}>
        όλοι
      </Link>
      {clients.map((c) => (
        <Link
          key={c.id}
          href={href({ client: c.id })}
          aria-current={query.client === c.id}
        >
          {c.name}
        </Link>
      ))}
      <span className="muted">Κανάλι:</span>
      <Link href={href({ channel: undefined })} aria-current={!query.channel}>
        όλα
      </Link>
      {CHANNELS.map((ch) => (
        <Link
          key={ch}
          href={href({ channel: ch })}
          aria-current={query.channel === ch}
        >
          {ch}
        </Link>
      ))}
    </div>
  );
}
