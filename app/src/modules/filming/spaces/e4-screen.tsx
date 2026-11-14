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
import { firstWorkingSlot } from "./e4-start";

import "./e.css";

// Από το module Παραγωγές, μέσω της σελίδας (οι Παραγωγές εισάγουν ήδη τα Γυρίσματα· έτσι δεν κάνουμε κύκλο).
export type E4InternalSource = () => Promise<
  { ok: true; data: readonly { id: string; title: string }[] } | { ok: false }
>;

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
}: {
  prefill: NewFilmingPrefill | null;
  fromRequest: FilmingFromRequest | null;
  // Ο Πελάτης που διαλέχτηκε πριν (`?client=`) και η διεύθυνσή του, αν έχει.
  preferred?: E4Preferred | null;
  internal: E4InternalSource;
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
  const [options, productions, hours] = await Promise.all([
    listBookingOptions(),
    caps.canBookInternal ? internal() : null,
    getBookingHours(),
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
  const start = hours.ok
    ? firstWorkingSlot(hours.data, { date: today, time: athensTime(now.toISOString()) })
    : null;
  return wrap(
    <E4Form
      options={options.data}
      productions={internalList}
      today={today}
      start={start}
      preferred={preferred}
      prefill={prefill}
      fromRequest={fromRequest}
    />,
  );
}
