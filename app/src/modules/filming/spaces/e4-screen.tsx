import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import type { NewFilmingPrefill } from "../blocked-prefill";
import { filmingCaps } from "../caps";
import { athensDate, athensTime } from "../helpers-time";
import { listBookingOptions } from "../queries";
import { getBookingHours } from "../queries-booking";
import type { FilmingFromRequest } from "../request-prefill";
import type { NamedRef } from "../types";
import { E4Form, type E4Preferred } from "./e4-form";
import { guideSlotOf, type E4BusySource } from "./e4-guide-load";
import type { HeldProduction } from "./e4-held";
import type { E4ReopenAction } from "./e4-held-notice";
import { startSlotOf } from "./e4-start";

import "./e.css";

// Από το module Παραγωγές, μέσω της σελίδας (οι Παραγωγές εισάγουν ήδη τα Γυρίσματα· έτσι δεν κάνουμε κύκλο).
export type E4InternalSource = () => Promise<
  { ok: true; data: readonly { id: string; title: string }[] } | { ok: false }
>;

// Οι Παραγωγές που δεν δέχονται Γυρίσματα, επίσης από τη σελίδα· null = δεν διαβάστηκαν (καμία γραμμή).
export type E4HeldSource = () => Promise<readonly HeldProduction[] | null>;

export interface E4GuideSources {
  busyOn: E4BusySource;
  held: E4HeldSource;
  reopen: E4ReopenAction | null;
}

const wrap = (body: ReactNode) => (
  <div data-spaces>
    <div className="e">{body}</div>
  </div>
);

// E4 Νέο Γύρισμα στη νέα εμφάνιση (prototype `screens/E4.tsx`): για όποιον «Κλείνει Γυρίσματα». Οι Εσωτερικές
// Παραγωγές φορτώνουν μόνο όταν επιτρέπεται Γύρισμα χωρίς Πελάτη (όπως η παλιά σελίδα).
export async function SpacesNewFilming({
  prefill,
  fromRequest,
  preferred = null,
  internal,
  guide = null,
}: {
  prefill: NewFilmingPrefill | null;
  fromRequest: FilmingFromRequest | null;
  // Ο Πελάτης που διαλέχτηκε πριν (`?client=`) και η διεύθυνσή του, αν έχει.
  preferred?: E4Preferred | null;
  internal: E4InternalSource;
  // Μέσα στον οδηγό «Στήνω γύρισμα»: τα πιασμένα διαστήματα της ομάδας (για την ώρα) και οι κλειστές Παραγωγές.
  guide?: E4GuideSources | null;
}) {
  const caps = filmingCaps(await getViewer());
  if (!caps.canBook)
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Νέο Γύρισμα για λογαριασμό πελάτη κλείνει όποιος «Κλείνει Γύρισμα».
        </p>
      </StateNotice>,
    );
  const [options, productions, hours, held] = await Promise.all([
    listBookingOptions(),
    caps.canBookInternal ? internal() : null,
    getBookingHours(),
    guide ? guide.held() : null,
  ]);
  if (!options.ok) return wrap(<ErrorNotice what="η φόρμα νέου Γυρίσματος" />);
  const internalList: NamedRef[] = productions?.ok
    ? productions.data.map(({ id, title }) => ({ id, name: title }))
    : [];
  if (options.data.length === 0 && internalList.length === 0)
    return wrap(
      <StateNotice kind="empty" title="Κανένας πελάτης με ενεργή Συμφωνία">
        <p>
          Γύρισμα κλείνεται για πελάτη με Συμφωνία που έχει ανοιχτή Περίοδο.
        </p>
      </StateNotice>,
    );
  const now = new Date();
  const today = athensDate(now);
  const first = startSlotOf(hours.ok ? hours.data : null, {
    date: today,
    time: athensTime(now.toISOString()),
  });
  const guided =
    guide && first && !prefill
      ? await guideSlotOf({
          options: options.data,
          clientId: fromRequest?.clientId ?? preferred?.clientId ?? null,
          hours: hours.ok ? hours.data : null,
          slot: first,
          busyOn: guide.busyOn,
        })
      : null;
  return wrap(
    <E4Form
      options={options.data}
      productions={internalList}
      today={today}
      start={guided?.slot ?? first}
      guide={
        guide
          ? {
              crewNote: guided?.crewNote ?? null,
              held: held ?? [],
              reopen: guide.reopen,
            }
          : null
      }
      preferred={preferred}
      prefill={prefill}
      fromRequest={fromRequest}
    />,
  );
}
