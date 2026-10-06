import { CALENDAR_LINK_OF } from "@/data/calendar";
import {
  calendarCapsOf,
  calendarItems,
  type CalendarCaps,
  type CalendarItem,
} from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import { A5Nav, A5RoleNote, A5Tabs, A5Toolbar } from "@/screens/a5-chrome";
import {
  layersOf,
  paramsQuery,
  parseParams,
  rangeOf,
  type A5Params,
} from "@/screens/a5-dates";
import { A5Filters } from "@/screens/a5-filters";
import { A5Google } from "@/screens/a5-google";
import { CalendarLinkCard } from "@/screens/a5-link";
import { A5List } from "@/screens/a5-list";
import { A5Month } from "@/screens/a5-month";
import { A5Week } from "@/screens/a5-week";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./a5.css";

const CLIENT_KEY = "client-maria";

interface BodyProps {
  role: RoleId;
  caps: CalendarCaps;
  params: A5Params;
  items: readonly CalendarItem[];
}

function EmptyHint({ caps }: { caps: CalendarCaps }) {
  return (
    <StateNotice kind="empty" title="Τίποτα αυτή την περίοδο">
      <p>
        {caps.isClient
          ? "Κλείσε Γύρισμα για να εμφανιστεί εδώ."
          : "Πρόσθεσε Κλεισμένο χρόνο όταν δεν είσαι διαθέσιμος."}
      </p>
    </StateNotice>
  );
}

function CalendarBody({ role, caps, params, items }: BodyProps) {
  const view =
    params.view === "month" ? (
      <A5Month role={role} params={params} items={items} />
    ) : params.view === "list" ? (
      <A5List role={role} items={items} />
    ) : (
      <A5Week role={role} params={params} items={items} />
    );
  return (
    <>
      {items.length === 0 && <EmptyHint caps={caps} />}
      {(params.view !== "list" || items.length > 0) && view}
    </>
  );
}

function Sidebar({ role, caps, params }: Omit<BodyProps, "items">) {
  const ownerKey = caps.isClient ? CLIENT_KEY : (caps.me ?? "");
  return (
    <div className="a5-side">
      {ownerKey in CALENDAR_LINK_OF && (
        <CalendarLinkCard ownerKey={ownerKey} isClient={caps.isClient} />
      )}
      {caps.hasTwoWay && <A5Google role={role} params={params} />}
    </div>
  );
}

export function A5({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = calendarCapsOf(role);
  const params = parseParams(query, state);
  const keep = { ...paramsQuery(params), state: undefined };
  const items =
    state === "empty"
      ? []
      : calendarItems(
          role,
          rangeOf(params.view, params.d),
          layersOf(params.hide),
          params.person,
        );
  return (
    <div className="a5">
      <StateSwitcher role={role} code="A5" state={state} keep={keep} />
      {!caps.canSee ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Το Ημερολόγιο το βλέπει η ομάδα και οι Πελάτες με λογαριασμό.</p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="το Ημερολόγιο" />
      ) : (
        <>
          <A5RoleNote role={role} />
          <A5Toolbar role={role} caps={caps} />
          <A5Tabs role={role} params={params} />
          <A5Nav role={role} params={params} />
          <A5Filters role={role} caps={caps} params={params} />
          <CalendarBody role={role} caps={caps} params={params} items={items} />
          <Sidebar role={role} caps={caps} params={params} />
        </>
      )}
    </div>
  );
}
