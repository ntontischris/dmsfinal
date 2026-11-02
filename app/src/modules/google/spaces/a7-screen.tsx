import { getViewer } from "@/modules/access";
import { formatDateTime } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { canSeeGoogleCalendar } from "../permissions";
import { getGoogleDeletions } from "../queries";
import { deletionItemOf } from "./a7-model";
import { A7Queue } from "./a7-queue";

import "./a7.css";

// A7 Διαγραφές από το Google στη νέα εμφάνιση (prototype `screens/A7.tsx`). Η λίστα «Πρόσφατα» του prototype λείπει:
// η βάση δίνει μόνο όσα περιμένουν απόφαση.
export async function SpacesGoogleDeletions() {
  const viewer = await getViewer();
  if (!canSeeGoogleCalendar(viewer))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τις διαγραφές από το Εταιρικό ημερολόγιο τις βλέπει όποιος έχει το
            Δικαίωμα «Ημερολόγιο Google».
          </p>
        </StateNotice>
      </div>
    );
  const deletions = await getGoogleDeletions();
  if (!deletions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="οι διαγραφές από το Google" />
      </div>
    );
  const nowMs = new Date().getTime();
  const items = deletions.data.map((deletion) =>
    deletionItemOf(deletion, nowMs, {
      dateTime: formatDateTime,
      filmingHref: (id) => hrefOf("E3", { id }),
    }),
  );
  return (
    <div data-spaces>
      <div className="a7">
        <p className="note">
          Η διαγραφή στο Google δεν ακυρώνει Γύρισμα. Αν δεν απαντήσει κανείς ως
          την προθεσμία, το γεγονός ξαναμπαίνει στο Google μόνο του.
        </p>
        {items.length === 0 ? (
          <StateNotice kind="empty" title="Καμία διαγραφή δεν περιμένει">
            <p>Όταν κάποιος σβήσει Γύρισμα στο Google, θα εμφανιστεί εδώ.</p>
          </StateNotice>
        ) : (
          <A7Queue pending={items} />
        )}
      </div>
    </div>
  );
}
