import { getViewer } from "@/modules/access";
import { athensDate, filmingCaps, formatDateTime } from "@/modules/filming";
import { getGoogleView } from "@/modules/google";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { buildCalendarDays } from "../calendar-days";
import { calendarCaps } from "../caps";
import { datesOf, rangeOf } from "../date-range";
import { getCalendarView, getLinkStatus } from "../queries";
import type { CalendarData } from "../types";
import { parseCalendarParams, type CalendarParams } from "../url-state";
import { A5Filters, A5Nav, A5Tabs, A5Toolbar } from "./a5-chrome";
import { A5Google } from "./a5-google";
import { CalendarLinkCard } from "./a5-link";
import { a5ItemsOf, hasEvents, layerOptions, type A5Item } from "./a5-model";
import { A5List, A5Month, A5Week } from "./a5-views";

import "./a5.css";

type RawQuery = Readonly<Record<string, string | string[] | undefined>>;

const CLIENT_NOTE =
  "Βλέπεις τα Γυρίσματά σου και, για κάθε μέρα, αν είναι ελεύθερη, γεμάτη ή κλειστή. Σε ελεύθερη μέρα μπορείς να κλείσεις Γύρισμα.";

function EmptyHint({ isTeam }: { isTeam: boolean }) {
  return (
    <StateNotice
      kind="empty"
      title={
        isTeam ? "Τίποτα αυτή την περίοδο" : "Κανένα Γύρισμα αυτή την περίοδο"
      }
    >
      <p>
        {isTeam
          ? "Για ρεπό, άδεια ή ραντεβού, πάτα «Ρεπό / Άδεια»."
          : "Κλείσε Γύρισμα για να εμφανιστεί εδώ."}
      </p>
    </StateNotice>
  );
}

interface BodyProps {
  params: CalendarParams;
  items: readonly A5Item[];
  today: string;
  isTeam: boolean;
}

function CalendarBody({ params, items, today, isTeam }: BodyProps) {
  const isEmpty = !hasEvents(items);
  const view =
    params.view === "month" ? (
      <A5Month params={params} items={items} today={today} />
    ) : params.view === "list" ? (
      <A5List items={items} />
    ) : (
      <A5Week params={params} items={items} today={today} />
    );
  return (
    <>
      {isEmpty && <EmptyHint isTeam={isTeam} />}
      {(params.view !== "list" || !isEmpty) && view}
    </>
  );
}

async function Sidebar({ data }: { data: CalendarData }) {
  const [link, google] = await Promise.all([
    getLinkStatus(),
    data.google ? getGoogleView() : null,
  ]);
  const createdAt = link.ok ? link.data.createdAt : null;
  return (
    <div className="a5-side">
      <CalendarLinkCard
        exists={link.ok && link.data.exists}
        createdLabel={createdAt ? formatDateTime(createdAt) : null}
        isClient={!data.isTeam}
      />
      {data.google && google?.ok && (
        <A5Google view={google.data} isStale={data.google.stale} />
      )}
    </div>
  );
}

// A5 Ημερολόγιο στη νέα εμφάνιση (prototype `screens/A5.tsx`): Εβδομάδα, Μήνας, Λίστα με τα στοιχεία που δίνει η βάση
// για τον θεατή (calendar_view). Τα επίπεδα ζουν στη διεύθυνση (?layers=), όπως στην παλιά εμφάνιση.
export async function SpacesCalendar({ query }: { query: RawQuery }) {
  const viewer = await getViewer();
  const caps = calendarCaps(viewer);
  if (!caps.canSee)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Το Ημερολόγιο το βλέπει η ομάδα και οι Πελάτες με λογαριασμό.</p>
        </StateNotice>
      </div>
    );
  const today = athensDate(new Date());
  const params = parseCalendarParams(query, today);
  const view = await getCalendarView(rangeOf(params.view, params.date));
  if (!view.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Ημερολόγιο" />
      </div>
    );
  const data = view.data;
  const days = buildCalendarDays(
    data,
    datesOf(params.view, params.date),
    params.layers,
  );
  const items = a5ItemsOf(days, data.isTeam, data.canBook);
  return (
    <div data-spaces>
      <div className="a5">
        <A5Toolbar
          isTeam={data.isTeam}
          canBlockOthers={data.canBlockOthers}
          canNewFilming={filmingCaps(viewer).canBook}
          canBook={data.canBook}
          date={params.date}
        />
        <A5Tabs params={params} />
        <A5Nav params={params} today={today} />
        {data.isTeam ? (
          <A5Filters
            params={params}
            options={layerOptions(data.busy.length > 0)}
          />
        ) : (
          <p className="note">{CLIENT_NOTE}</p>
        )}
        <CalendarBody
          params={params}
          items={items}
          today={today}
          isTeam={data.isTeam}
        />
        <Sidebar data={data} />
      </div>
    </div>
  );
}
