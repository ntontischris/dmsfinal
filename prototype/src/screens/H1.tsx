import Link from "next/link";

import {
  deliverableCapsOf,
  pendingCharges,
  queueOf,
  queueViewsOf,
  type QueueView,
} from "@/data/deliverables-access";
import { ChargesCard, RulesCard } from "@/screens/h1-panels";
import { ClientQueueTable, ForMeTable } from "@/screens/h1-rows";
import { ReviewTable } from "@/screens/h1-review";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./h1.css";

const EMPTY: Readonly<Record<QueueView, { title: string; text: string }>> = {
  "για μένα": {
    title: "Τίποτα δεν περιμένει εσένα.",
    text: "Δεν υπάρχει Παραδοτέο που να περιμένει εσένα αυτή τη στιγμή.",
  },
  "προς έλεγχο": {
    title: "Καμία Έκδοση δεν περιμένει έλεγχο.",
    text: "Όταν κάποιος προσθέσει Έκδοση, θα εμφανιστεί εδώ.",
  },
  "στον πελάτη": {
    title: "Τίποτα δεν περιμένει πελάτη.",
    text: "Κανένα Παραδοτέο δεν αναμένει απάντηση πελάτη.",
  },
};

const CLIENT_NOTE =
  "Αν ο πελάτης ενέκρινε τηλεφωνικά, ζήτησέ του να πατήσει το κουμπί στο email, ή παράδωσε την Παραγωγή χειροκίνητα με σχόλιο.";

const parseView = (value: string | undefined, views: readonly QueueView[]) =>
  views.find((v) => v === value) ?? views[0];

export function H1({ role, query }: ScreenProps) {
  const caps = deliverableCapsOf(role);
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="H1"
      state={state}
      keep={{ view: query.view, team: query.team }}
    />
  );
  if (!caps.canWork) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Η Ουρά Παραδοτέων είναι για την ομάδα.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="την Ουρά Παραδοτέων" />
      </>
    );
  }
  const views = queueViewsOf(role);
  const view = parseView(query.view, views);
  const isTeam = caps.canReview && query.team === "1";
  const items = (v: QueueView) =>
    state === "empty" ? [] : queueOf(role, v, v === "για μένα" && isTeam);
  const shown = items(view);
  const charges = state === "empty" ? [] : pendingCharges(role);

  return (
    <>
      {header}
      {caps.isScoped && (
        <p className="note">
          Με αφορά: μόνο Παραδοτέα Παραγωγών όπου είσαι Μέλος.
        </p>
      )}
      {caps.canSeeAmounts && <ChargesCard role={role} items={charges} />}
      <nav className="tabs" aria-label="Προβολή ουράς">
        {views.map((v) => (
          <Link
            key={v}
            className="tab"
            aria-current={v === view ? "page" : undefined}
            href={screenHref(role, "H1", {
              view: v === views[0] ? undefined : v,
              team: isTeam ? "1" : undefined,
              state: query.state,
            })}
          >
            {v} ({items(v).length})
          </Link>
        ))}
      </nav>
      {view === "για μένα" && caps.canReview && (
        <TeamToggle role={role} isTeam={isTeam} state={query.state} />
      )}
      {shown.length === 0 ? (
        <StateNotice kind="empty" title={EMPTY[view].title}>
          {EMPTY[view].text}
        </StateNotice>
      ) : view === "για μένα" ? (
        <ForMeTable role={role} items={shown} />
      ) : view === "προς έλεγχο" ? (
        <ReviewTable role={role} items={shown} />
      ) : (
        <>
          <p className="note">{CLIENT_NOTE}</p>
          <ClientQueueTable role={role} items={shown} />
        </>
      )}
      {caps.canReview && <RulesCard />}
    </>
  );
}

function TeamToggle(props: {
  role: ScreenProps["role"];
  isTeam: boolean;
  state: string | undefined;
}) {
  const href = (team: boolean) =>
    screenHref(props.role, "H1", {
      team: team ? "1" : undefined,
      state: props.state,
    });
  return (
    <p className="h1-toolbar">
      <Link
        className="button"
        data-primary={!props.isTeam}
        href={href(false)}
      >
        Μόνο εμένα
      </Link>
      <Link className="button" data-primary={props.isTeam} href={href(true)}>
        Όλη η ομάδα
      </Link>
    </p>
  );
}
