import { calendarCapsOf } from "@/data/calendar-access";
import { deletionItems } from "@/screens/a7-model";
import { A7Queue } from "@/screens/a7-queue";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./a7.css";

// Επιβεβαίωση διαγραφής Γυρίσματος από το Google: Ιδ · Δι (Αμφίδρομο ημερολόγιο).
export function A7({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = calendarCapsOf(role);
  const { pending, recent } = deletionItems(role);
  return (
    <div className="a7">
      <StateSwitcher role={role} code="A7" state={state} />
      {!caps.canResolveDeletions ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τις διαγραφές από το Εταιρικό ημερολόγιο τις επιβεβαιώνει όποιος
            έχει το Δικαίωμα «Αμφίδρομο ημερολόγιο Google».
          </p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="τις διαγραφές από το Google" />
      ) : (
        <>
          <p className="note">
            Η διαγραφή στο Google δεν ακυρώνει Γύρισμα. Ειδοποιείται όποιος το
            έσβησε, αλλά μπορεί να το λύσει όποιος έχει το Δικαίωμα. Αν δεν
            απαντήσει κανείς ως την προθεσμία, το γεγονός ξαναμπαίνει στο Google
            μόνο του. Γύρισμα που έγινε ή δεν έγινε ξαναμπαίνει αμέσως, χωρίς
            ερώτηση: το ιστορικό δεν ακυρώνεται.
          </p>
          {state === "empty" || pending.length === 0 ? (
            <StateNotice kind="empty" title="Καμία διαγραφή δεν περιμένει">
              <p>Όταν κάποιος σβήσει Γύρισμα στο Google, θα εμφανιστεί εδώ.</p>
            </StateNotice>
          ) : null}
          <A7Queue
            key={state}
            pending={state === "empty" ? [] : pending}
            recent={state === "empty" ? [] : recent}
          />
        </>
      )}
    </div>
  );
}
