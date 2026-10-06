import Link from "next/link";

import { financeCapsOf } from "@/data/finance-access";
import type { RoleId } from "@/data/roles";
import { allRows, byClient, byMonth } from "@/screens/i7-model";
import { GroupTable, ProductionTable } from "@/screens/i7-tables";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./i67.css";

const VIEWS = ["παραγωγή", "πελάτης", "μήνας"] as const;
type View = (typeof VIEWS)[number];

const parseView = (value: string | undefined): View =>
  VIEWS.find((v) => v === value) ?? VIEWS[0];

function ViewTabs(props: {
  role: RoleId;
  view: View;
  state: string | undefined;
}) {
  return (
    <nav className="tabs" aria-label="Προβολή κερδοφορίας">
      {VIEWS.map((v) => (
        <Link
          key={v}
          className="tab"
          aria-current={v === props.view ? "page" : undefined}
          href={screenHref(props.role, "I7", {
            view: v === VIEWS[0] ? undefined : v,
            state: props.state,
          })}
        >
          {v}
        </Link>
      ))}
    </nav>
  );
}

function Body(props: { role: RoleId; view: View; isEmpty: boolean }) {
  const rows = props.isEmpty ? [] : allRows();
  if (rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Παραγωγές για κερδοφορία">
        Όταν υπάρξουν Παραγωγές με τιμή και κόστος, θα εμφανιστούν εδώ.
      </StateNotice>
    );
  }
  if (props.view === "παραγωγή") {
    return <ProductionTable role={props.role} rows={rows} />;
  }
  return props.view === "πελάτης" ? (
    <GroupTable groups={byClient(rows)} isMonth={false} />
  ) : (
    <GroupTable groups={byMonth(rows)} isMonth />
  );
}

export function I7({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const view = parseView(query.view);
  const header = (
    <StateSwitcher
      role={role}
      code="I7"
      state={state}
      keep={{ view: query.view }}
    />
  );
  if (!financeCapsOf(role).canSeeCost) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την Κερδοφορία τη βλέπουν όσοι βλέπουν κόστος.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="την Κερδοφορία" />
      </>
    );
  }
  return (
    <>
      {header}
      <p className="note">
        Ο Τζίρος (Τιμολόγια) είναι στις Αναφορές· εδώ μετρά η τιμή της
        Παραγωγής.
      </p>
      <ViewTabs role={role} view={view} state={query.state} />
      <Body role={role} view={view} isEmpty={state === "empty"} />
    </>
  );
}
