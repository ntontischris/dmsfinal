import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { agreementCaps } from "../helpers";
import { listApprovals } from "../queries-agreements";
import { ApprovalQueue } from "./d4-queue";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

const RIGHTS_NOTE =
  "Ο Ιδιοκτήτης και η Διαχείριση έχουν το Δικαίωμα «Παρεκκλίνει από τον Κατάλογο», άρα οι δικές τους προτάσεις δεν περνούν από εδώ. Σε εταιρεία ενός ανθρώπου η λίστα μένει άδεια.";

// D4 Προτάσεις προς έγκριση στη νέα εμφάνιση (prototype `screens/D4.tsx`).
export async function SpacesApprovals() {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canDeviate)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τις προτάσεις προς έγκριση τις βλέπει όποιος «Παρεκκλίνει από τον
            Κατάλογο».
          </p>
        </StateNotice>
      </Frame>
    );
  const found = await listApprovals();
  if (!found.ok)
    return (
      <Frame>
        <ErrorNotice what="οι Προτάσεις προς έγκριση" />
      </Frame>
    );
  return (
    <Frame>
      <p className="note">{RIGHTS_NOTE}</p>
      {found.data.length === 0 ? (
        <StateNotice
          kind="empty"
          title="Καμία πρόταση δεν περιμένει Έγκριση."
        />
      ) : (
        <ApprovalQueue items={found.data} canSeeAmounts={caps.canSeeAmounts} />
      )}
    </Frame>
  );
}
