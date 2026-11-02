import Link from "next/link";
import type { ReactNode } from "react";

import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import type { BookingSelection } from "../booking-links";
import { hasProvision, planBooking, type BookingPlan } from "../booking-plan";
import type { BookingOptions } from "../booking-types";
import { athensTime } from "../helpers-time";
import {
  getBookingOptions,
  listBookingDays,
  listBookingSlots,
} from "../queries-booking";
import { E5Booking } from "./e5-booking";
import { dayViewsOf } from "./e5-model";

import "./e.css";

const wrap = (body: ReactNode) => (
  <div data-spaces>
    <div className="e">{body}</div>
  </div>
);

function NoBooking() {
  return (
    <section className="card notice" data-kind="empty" role="status">
      <h2>Δεν σου μένει γύρισμα να κλείσεις</h2>
      <p className="muted">
        Το πακέτο σου δεν έχει ελεύθερο γύρισμα αυτή τη στιγμή. Μπορείς να μας
        ζητήσεις ένα επιπλέον γύρισμα.
      </p>
      <Link className="button" data-primary="true" href={hrefOf("J3")}>
        Ζήτα επιπλέον γύρισμα
      </Link>
    </section>
  );
}

// Η μέρα, η διάρκεια (μόνο αν τη διάλεξε ο πελάτης) και οι ελεύθερες ώρες της, από τη βάση.
async function loadSteps(plan: BookingPlan, selection: BookingSelection) {
  const lookup = {
    agreementId: plan.agreement.id,
    kindId: plan.kind.id,
    excludeId: selection.reschedule ?? null,
  };
  const hours = selection.hours !== undefined ? plan.hours : null;
  const [days, slots] = await Promise.all([
    listBookingDays(lookup),
    selection.day && hours !== null
      ? listBookingSlots({ ...lookup, day: selection.day, hours })
      : null,
  ]);
  return { days, slots, hours };
}

async function Booking({
  options,
  selection,
}: {
  options: BookingOptions;
  selection: BookingSelection;
}) {
  const plan = planBooking(options, selection);
  if (!plan) return <NoBooking />;
  const { days, slots, hours } = await loadSteps(plan, selection);
  if (!days.ok || (slots && !slots.ok))
    return <ErrorNotice what="οι ελεύθερες μέρες και ώρες" />;
  const times = slots?.ok ? slots.data.map(athensTime) : null;
  const time = times?.includes(selection.time ?? "")
    ? (selection.time ?? null)
    : null;
  return (
    <E5Booking
      selection={selection}
      days={dayViewsOf(days.data, plan.agreement.noticeHours)}
      durations={options.durations}
      hours={hours}
      times={times}
      time={time}
      agreements={options.agreements.map((a) => ({
        id: a.id,
        label: a.title,
        isAvailable: a.kinds.some(hasProvision),
      }))}
      kinds={plan.agreement.kinds.map((k) => ({
        id: k.id,
        label: k.label,
        isAvailable: hasProvision(k),
      }))}
      agreementId={plan.agreement.id}
      kindId={plan.kind.id}
      kindLabel={plan.kind.label}
      noticeHours={plan.agreement.noticeHours}
      cancelHours={plan.agreement.cancelHours}
      horizonDays={options.horizonDays}
      needsApproval={plan.agreement.bookingNeedsApproval}
      messagesHref={hrefOf("J3")}
    />
  );
}

// E5 Κράτηση Γυρίσματος στη νέα εμφάνιση (prototype `screens/E5.tsx`): μόνο για όποιον «Κλείνει Γύρισμα» (c.book).
// Η επιλογή ζει στη διεύθυνση (?agreement, kind, day, hours, time, reschedule)· η βάση ελέγχει κάθε βήμα.
export async function SpacesBooking({
  selection,
}: {
  selection: BookingSelection;
}) {
  const viewer = await getViewer();
  if (!can(viewer, "c.book"))
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Την κράτηση την κάνει ο πελάτης. Η ομάδα κλείνει Γύρισμα από το «Νέο
          Γύρισμα».
        </p>
      </StateNotice>,
    );
  const options = await getBookingOptions();
  if (!options.ok)
    return wrap(<ErrorNotice what="οι ελεύθερες μέρες και ώρες" />);
  if (!options.data.isSet)
    return wrap(
      <StateNotice kind="empty" title="Οι κρατήσεις δεν έχουν ανοίξει ακόμα">
        <p>Η ομάδα θα ανοίξει τις κρατήσεις σύντομα.</p>
      </StateNotice>,
    );
  return wrap(<Booking options={options.data} selection={selection} />);
}
