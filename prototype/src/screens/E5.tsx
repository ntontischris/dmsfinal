import { E5Booking } from "@/screens/e5-booking";
import { cancelHoursOf, noticeDaysOf } from "@/screens/e5-days";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./e5.css";

// Κράτηση Γυρίσματος: μόνο ο πελάτης (Κυψέλη Καφέ). Η κατάσταση «κενή» δείχνει πελάτη χωρίς καμία Παροχή.
export function E5({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  return (
    <div className="e">
      <StateSwitcher role={role} code="E5" state={state} />
      <h1>Κράτηση Γυρίσματος</h1>
      {role !== "client" ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Την κράτηση την κάνει ο πελάτης. Η ομάδα κλείνει Γύρισμα από το «Νέο
            Γύρισμα».
          </p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="οι ελεύθερες μέρες και ώρες" />
      ) : (
        <E5Booking
          key={state}
          noBenefit={state === "empty"}
          noticeDays={noticeDaysOf()}
          cancelHours={cancelHoursOf()}
          messagesHref={screenHref(role, "J3", {})}
        />
      )}
    </div>
  );
}
